import DefaultWebSocket from 'isomorphic-ws';

import type { RequestOptions } from '../types/shared.types.js';
import type {
  WebsocketClientEventMap,
  WebsocketClientOptions,
  WebsocketExceptionEvent,
} from '../types/websockets/ws-general.js';
import type {
  WebSocketConstructor,
  WebSocketLike,
  WebSocketMessageEvent,
} from '../types/websockets/ws-portable.js';
import { EventEmitter } from './event-emitter.js';
import { HyperliquidWebSocketError } from './websocket/errors.js';
import {
  DefaultLogger,
  type DefaultLogger as Logger,
} from './websocket/logger.js';
import { createDeferredPromise, WsStore } from './websocket/WsStore.js';
import {
  WsConnectionStateEnum,
  type WsStoredState,
} from './websocket/WsStore.types.js';

export type WSOperation = 'subscribe' | 'unsubscribe';
export type EmittableEvent<TWsKey extends string> =
  | { eventType: 'pong' }
  | {
      [K in 'exception' | 'message' | 'response']: {
        eventType: K;
        event: WebsocketClientEventMap<TWsKey>[K][0];
      };
    }['exception' | 'message' | 'response'];

type LifecycleOptions = Pick<
  WebsocketClientOptions,
  | 'autoReconnect'
  | 'connectionTimeout'
  | 'maxReconnectTimeout'
  | 'pingInterval'
  | 'pongTimeout'
  | 'reconnectTimeout'
  | 'requestTimeoutMs'
  | 'webSocketConstructor'
>;

function finiteTimeout(
  value: number | undefined,
  fallback: number,
  field: string,
  allowZero = false,
): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || (allowZero ? result < 0 : result <= 0)) {
    throw new RangeError(
      `${field} must be a finite number ${allowZero ? 'at least' : 'greater than'} 0.`,
    );
  }
  return result;
}

/**
 * Shared SDK lifecycle architecture: the base orchestrates connections and topic
 * caching, WsStore owns their state, and exchange-specific hooks own the wire protocol.
 * Hyperliquid account streams do not have a connection authentication handshake.
 */
export abstract class BaseWebsocketClient<
  TWsKey extends string,
  TTopic extends object,
> extends EventEmitter<WebsocketClientEventMap<TWsKey>> {
  protected readonly logger: Logger;

  private readonly wsStore = new WsStore<TWsKey, TTopic>();

  private readonly options: Required<LifecycleOptions>;

  protected constructor(
    options: LifecycleOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super();
    this.logger = logger;
    this.options = {
      autoReconnect: options.autoReconnect !== false,
      connectionTimeout: finiteTimeout(
        options.connectionTimeout,
        1_000,
        'connectionTimeout',
      ),
      maxReconnectTimeout: finiteTimeout(
        options.maxReconnectTimeout,
        10_000,
        'maxReconnectTimeout',
        true,
      ),
      pingInterval: finiteTimeout(
        options.pingInterval,
        10_000,
        'pingInterval',
        true,
      ),
      pongTimeout: finiteTimeout(
        options.pongTimeout,
        1_000,
        'pongTimeout',
        true,
      ),
      reconnectTimeout: finiteTimeout(
        options.reconnectTimeout,
        500,
        'reconnectTimeout',
        true,
      ),
      requestTimeoutMs: finiteTimeout(
        options.requestTimeoutMs,
        10_000,
        'requestTimeoutMs',
      ),
      webSocketConstructor:
        options.webSocketConstructor ??
        (DefaultWebSocket as unknown as WebSocketConstructor),
    };
  }

  protected getWsStore(): WsStore<TWsKey, TTopic> {
    return this.wsStore;
  }

  protected isWsConnected(wsKey: TWsKey): boolean {
    return this.wsStore.isWsOpen(wsKey);
  }

  protected connectWebsocket(wsKey: TWsKey): Promise<void> {
    const state = this.getOrCreateState(wsKey);
    if (this.wsStore.isWsOpen(wsKey)) {
      return Promise.resolve();
    }
    if (state.connectionInProgress) {
      return state.connectionInProgress.promise;
    }

    clearTimeout(state.activeReconnectTimer);
    state.activeReconnectTimer = undefined;
    const pending = createDeferredPromise<void>();
    state.connectionInProgress = pending;
    state.connectionState = WsConnectionStateEnum.CONNECTING;

    try {
      const socket = new this.options.webSocketConstructor(
        this.getWsUrl(wsKey),
      );
      state.ws = socket;
      socket.binaryType = 'arraybuffer';
      socket.onopen = () => this.onWsOpen(wsKey, socket);
      socket.onmessage = (event) => this.onWsMessage(wsKey, socket, event.data);
      socket.onerror = (event) => {
        if (!this.isCurrentConnection(wsKey, socket)) {
          return;
        }
        const error = new HyperliquidWebSocketError(
          'The Hyperliquid WebSocket connection failed.',
          { cause: event },
        );
        this.emitException(wsKey, event);
        this.onWsDisconnect(wsKey, socket, event, error, true);
      };
      socket.onclose = (event) =>
        this.onWsDisconnect(
          wsKey,
          socket,
          event,
          new HyperliquidWebSocketError(
            'The Hyperliquid WebSocket connection closed.',
            { cause: event },
          ),
        );
      state.activeConnectionTimer = setTimeout(() => {
        if (!this.isCurrentConnection(wsKey, socket)) {
          return;
        }
        const error = new HyperliquidWebSocketError(
          `WebSocket connection timed out after ${this.options.connectionTimeout} ms.`,
        );
        this.emitException(wsKey, error);
        this.onWsDisconnect(wsKey, socket, error, error, true);
      }, this.options.connectionTimeout);
    } catch (error) {
      const socket = state.ws;
      state.ws = undefined;
      this.clearTimers(state);
      if (socket) {
        this.releaseSocket(socket, true, true);
      }
      state.connectionState = WsConnectionStateEnum.ERROR;
      this.rejectConnection(state, error);
      this.wsStore.rejectAllDeferredPromises(
        wsKey,
        this.requestSendError(error),
      );
      this.emitException(wsKey, error);
      this.scheduleReconnect(wsKey, state, error);
    }
    return pending.promise;
  }

  protected async subscribeTopicsForWsKey(
    topics: TTopic[],
    wsKey: TWsKey,
  ): Promise<void> {
    this.getOrCreateState(wsKey);
    const added = topics.filter((topic) => this.wsStore.addTopic(wsKey, topic));
    if (!this.wsStore.isWsOpen(wsKey)) {
      // Cache first: the open/reconnect handler sends the latest set of topics.
      await this.connectWebsocket(wsKey);
      return;
    }
    this.requestTopics(wsKey, 'subscribe', added);
  }

  protected async unsubscribeTopicsForWsKey(
    topics: TTopic[],
    wsKey: TWsKey,
  ): Promise<void> {
    const removed = topics.filter((topic) =>
      this.wsStore.deleteTopic(wsKey, topic),
    );
    if (this.wsStore.isWsOpen(wsKey)) {
      this.requestTopics(wsKey, 'unsubscribe', removed);
    }
  }

  protected tryWsSend(wsKey: TWsKey, message: string): void {
    const socket = this.wsStore.getWs(wsKey);
    if (!socket || socket.readyState !== 1) {
      throw new HyperliquidWebSocketError(
        'The Hyperliquid WebSocket connection is not open.',
      );
    }
    socket.send(message);
  }

  protected sendRequest<T>(
    wsKey: TWsKey,
    id: string,
    payload: object,
    options: RequestOptions = {},
  ): Promise<T> {
    if (options.signal?.aborted) {
      return Promise.reject(
        new HyperliquidWebSocketError('WebSocket request was aborted.'),
      );
    }
    const timeoutMs = finiteTimeout(
      options.timeout,
      this.options.requestTimeoutMs,
      'timeout',
    );
    this.getOrCreateState(wsKey);
    const pending = this.wsStore.createDeferredPromise(wsKey, id);
    const timer = setTimeout(() => {
      this.wsStore.rejectDeferredPromise(
        wsKey,
        id,
        new HyperliquidWebSocketError(
          `WebSocket request timed out after ${timeoutMs} ms.`,
        ),
      );
    }, timeoutMs);
    const abort = () =>
      this.wsStore.rejectDeferredPromise(
        wsKey,
        id,
        new HyperliquidWebSocketError('WebSocket request was aborted.'),
      );
    pending.cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener?.('abort', abort);
    };
    options.signal?.addEventListener?.('abort', abort, { once: true });

    void this.connectWebsocket(wsKey)
      .then(() => {
        // A timed-out, cancelled or closed request must never be sent after opening.
        if (this.wsStore.getDeferredPromise(wsKey, id) === pending) {
          this.tryWsSend(wsKey, JSON.stringify(payload));
        }
      })
      .catch((error) => {
        if (this.wsStore.getDeferredPromise(wsKey, id) === pending) {
          this.wsStore.rejectDeferredPromise(
            wsKey,
            id,
            this.requestSendError(error),
          );
        }
      });
    return pending.promise as Promise<T>;
  }

  protected closeWebsocket(wsKey: TWsKey): void {
    const state = this.wsStore.get(wsKey);
    if (!state) {
      return;
    }
    state.connectionState = WsConnectionStateEnum.CLOSING;
    this.clearTimers(state);
    const error = new HyperliquidWebSocketError(
      'The Hyperliquid WebSocket client was closed.',
    );
    this.rejectConnection(state, error);
    this.wsStore.rejectAllDeferredPromises(wsKey, error);
    const socket = state.ws;
    this.wsStore.delete(wsKey);
    if (socket) {
      this.releaseSocket(socket, true);
    }
    this.emitEvent('close', {
      wsKey,
      event: { code: 1000, reason: 'Client closed' },
    });
  }

  closeAll(): void {
    for (const wsKey of this.wsStore.getKeys()) {
      this.closeWebsocket(wsKey);
    }
  }

  protected emitException(wsKey: TWsKey, event: unknown): void {
    this.emitEvent('exception', { event, wsKey });
  }

  protected emitEvent<K extends keyof WebsocketClientEventMap<TWsKey>>(
    eventType: K,
    event: WebsocketClientEventMap<TWsKey>[K][0],
  ): void {
    if (eventType === 'exception') {
      const exception = event as WebsocketExceptionEvent<TWsKey>;
      this.logger.error(
        'WebSocket exception',
        exception.wsKey,
        exception.event ?? exception.data,
      );
    } else if (eventType !== 'message' && eventType !== 'response') {
      this.logger.trace('WebSocket lifecycle', eventType, event.wsKey);
    }
    try {
      this.emit(eventType, ...([event] as WebsocketClientEventMap<TWsKey>[K]));
    } catch (error) {
      if (eventType === 'exception') {
        this.logger.error('WebSocket exception listener failed', error);
      } else {
        this.emitException(event.wsKey, error);
      }
    }
  }

  private getOrCreateState(wsKey: TWsKey): WsStoredState<TTopic> {
    const existing = this.wsStore.get(wsKey);
    if (existing) {
      return existing;
    }
    const limit = this.getMaxConnections();
    if (this.wsStore.getKeys().length >= limit) {
      throw new Error(
        `This client already manages the maximum of ${limit} WebSocket connections.`,
      );
    }
    return this.wsStore.get(wsKey, true);
  }

  private requestTopics(
    wsKey: TWsKey,
    operation: WSOperation,
    topics: TTopic[],
  ): void {
    if (!topics.length) {
      return;
    }
    const socket = this.wsStore.getWs(wsKey);
    try {
      for (const request of this.getWsRequestEvents(wsKey, operation, topics)) {
        this.tryWsSend(wsKey, JSON.stringify(request));
      }
    } catch (error) {
      // Recover from a failed send using the desired topic cache. Otherwise a
      // deduplicated retry could incorrectly assume this topic was already sent.
      if (socket) {
        this.onWsDisconnect(wsKey, socket, error, error, true);
      }
      throw error;
    }
  }

  private onWsOpen(wsKey: TWsKey, socket: WebSocketLike): void {
    if (!this.isCurrentConnection(wsKey, socket)) {
      return;
    }
    const state = this.wsStore.get(wsKey, true);
    clearTimeout(state.activeConnectionTimer);
    state.activeConnectionTimer = undefined;
    state.connectionState = WsConnectionStateEnum.CONNECTED;

    try {
      this.requestTopics(wsKey, 'subscribe', this.wsStore.getTopics(wsKey));
    } catch (error) {
      this.emitException(wsKey, error);
      this.onWsDisconnect(wsKey, socket, error, error, true);
      return;
    }

    const eventType = state.hasOpened ? 'reconnected' : 'open';
    state.hasOpened = true;
    state.reconnectAttempts = 0;

    this.startHeartbeat(wsKey, socket, state);
    const pending = state.connectionInProgress;
    state.connectionInProgress = undefined;
    pending?.resolve();
    this.emitEvent(eventType, {
      ws: socket,
      wsKey,
      wsUrl: this.getWsUrl(wsKey),
    });
  }

  private onWsMessage(
    wsKey: TWsKey,
    socket: WebSocketLike,
    data: WebSocketMessageEvent['data'],
  ): void {
    if (!this.isCurrentConnection(wsKey, socket)) {
      return;
    }
    const state = this.wsStore.get(wsKey, true);
    const deliver = (message: string) => {
      if (!this.isCurrentConnection(wsKey, socket)) {
        return;
      }
      try {
        for (const event of this.resolveEmittableEvents(wsKey, message)) {
          if (event.eventType === 'pong') {
            clearTimeout(state.activePongTimer);
            state.activePongTimer = undefined;
          } else {
            this.emitEvent(event.eventType, event.event);
          }
        }
      } catch (error) {
        this.emitException(wsKey, error);
      }
    };
    const decode = (): void | Promise<void> => {
      if (typeof data === 'string') {
        deliver(data);
      } else if (data instanceof Blob) {
        return data.text().then(deliver);
      } else {
        const bytes = ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : new Uint8Array(data);
        deliver(new TextDecoder().decode(bytes));
      }
    };

    // Keep wire order when a browser Blob requires asynchronous decoding.
    try {
      const work = state.messageQueue
        ? state.messageQueue.then(decode)
        : decode();
      if (work) {
        const queued = work
          .catch((error) => {
            if (this.isCurrentConnection(wsKey, socket)) {
              this.emitException(wsKey, error);
            }
          })
          .finally(() => {
            if (state.messageQueue === queued) {
              state.messageQueue = undefined;
            }
          });
        state.messageQueue = queued;
      }
    } catch (error) {
      this.emitException(wsKey, error);
    }
  }

  private onWsDisconnect(
    wsKey: TWsKey,
    socket: WebSocketLike,
    event: unknown,
    error: unknown,
    closeSocket = false,
  ): void {
    if (!this.isCurrentConnection(wsKey, socket)) {
      return;
    }
    const state = this.wsStore.get(wsKey, true);
    const wasConnecting = Boolean(state.connectionInProgress);
    state.ws = undefined;
    state.messageQueue = undefined;
    this.clearTimers(state);
    this.rejectConnection(state, error);
    this.wsStore.rejectAllDeferredPromises(
      wsKey,
      wasConnecting ? this.requestSendError(error) : error,
    );
    state.connectionState = WsConnectionStateEnum.INITIAL;
    this.releaseSocket(socket, closeSocket, true);
    if (this.options.autoReconnect) {
      this.scheduleReconnect(wsKey, state, event);
    } else {
      this.emitEvent('close', { event, wsKey });
    }
  }

  private scheduleReconnect(
    wsKey: TWsKey,
    state: WsStoredState<TTopic>,
    event: unknown,
  ): void {
    if (
      !this.options.autoReconnect ||
      this.wsStore.get(wsKey) !== state ||
      state.activeReconnectTimer !== undefined
    ) {
      return;
    }
    const delay = Math.min(
      this.options.maxReconnectTimeout,
      this.options.reconnectTimeout *
        2 ** Math.min(state.reconnectAttempts, 30),
    );
    state.reconnectAttempts += 1;
    state.connectionState = WsConnectionStateEnum.RECONNECTING;
    state.activeReconnectTimer = setTimeout(() => {
      state.activeReconnectTimer = undefined;
      if (this.wsStore.get(wsKey) !== state) {
        return;
      }
      void this.connectWebsocket(wsKey).catch((error) => {
        this.logger.trace('WebSocket reconnect attempt failed', wsKey, error);
      });
    }, delay);
    this.emitEvent('reconnecting', {
      event: { attempt: state.reconnectAttempts, delay, cause: event },
      wsKey,
    });
  }

  private startHeartbeat(
    wsKey: TWsKey,
    socket: WebSocketLike,
    state: WsStoredState<TTopic>,
  ): void {
    if (this.options.pingInterval === 0) {
      return;
    }

    state.activePingTimer = setInterval(() => {
      if (!this.isCurrentConnection(wsKey, socket) || socket.readyState !== 1) {
        return;
      }
      try {
        if (
          !this.sendPingEvent(wsKey) ||
          this.options.pongTimeout === 0 ||
          state.activePongTimer !== undefined
        ) {
          return;
        }
        state.activePongTimer = setTimeout(() => {
          const error = new HyperliquidWebSocketError(
            'WebSocket heartbeat timed out.',
          );
          this.onWsDisconnect(wsKey, socket, error, error, true);
        }, this.options.pongTimeout);
      } catch (error) {
        this.emitException(wsKey, error);
        this.onWsDisconnect(wsKey, socket, error, error, true);
      }
    }, this.options.pingInterval);
  }

  private isCurrentConnection(wsKey: TWsKey, socket: WebSocketLike): boolean {
    return this.wsStore.getWs(wsKey) === socket;
  }

  private rejectConnection(state: WsStoredState<TTopic>, error: unknown): void {
    state.connectionInProgress?.reject(error);
    state.connectionInProgress = undefined;
  }

  private clearTimers(state: WsStoredState<TTopic>): void {
    clearTimeout(state.activeConnectionTimer);
    clearInterval(state.activePingTimer);
    clearTimeout(state.activePongTimer);
    clearTimeout(state.activeReconnectTimer);
    state.activeConnectionTimer = undefined;
    state.activePingTimer = undefined;
    state.activePongTimer = undefined;
    state.activeReconnectTimer = undefined;
  }

  private releaseSocket(
    socket: WebSocketLike,
    closeSocket: boolean,
    force = false,
  ): void {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    // Node's ws may report an expected abort error while closing a connecting socket.
    // Keep a handler on this retired socket so that its error cannot become unhandled.
    socket.onerror = () => undefined;
    if (closeSocket) {
      try {
        if (force && socket.terminate) {
          socket.terminate();
        } else {
          socket.close(1000, 'Client closed');
        }
      } catch (error) {
        this.logger.error('Failed to close a WebSocket connection', error);
      }
    }
  }

  private requestSendError(error: unknown): HyperliquidWebSocketError {
    return new HyperliquidWebSocketError(
      'Failed to send the Hyperliquid WebSocket request.',
      { cause: error },
    );
  }

  protected abstract getWsUrl(wsKey: TWsKey): string;

  protected abstract getMaxConnections(): number;

  protected abstract getWsRequestEvents(
    wsKey: TWsKey,
    operation: WSOperation,
    topics: TTopic[],
  ): object[];

  protected abstract resolveEmittableEvents(
    wsKey: TWsKey,
    message: string,
  ): EmittableEvent<TWsKey>[];

  protected abstract sendPingEvent(wsKey: TWsKey): boolean;
}
