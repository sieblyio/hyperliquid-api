import DefaultWebSocket from 'isomorphic-ws';

import type { RequestOptions } from '../types/shared.types.js';
import type {
  WebsocketClientEventMap,
  WebsocketClientOptions,
} from '../types/websockets/ws-general.js';
import type {
  WebSocketCloseEvent,
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

  protected readonly WS_LOGGER_CATEGORY: { category: string };

  private readonly wsStore: WsStore<TWsKey, TTopic>;

  private readonly options: Required<LifecycleOptions>;

  protected constructor(
    options: LifecycleOptions & { wsLoggerCategory?: string } = {},
    logger: Logger = DefaultLogger,
  ) {
    super();
    this.logger = logger;
    this.WS_LOGGER_CATEGORY = {
      category: options.wsLoggerCategory ?? 'WsClient',
    };
    this.wsStore = new WsStore(logger, this.WS_LOGGER_CATEGORY);
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
      const url = this.getWsUrl(wsKey);
      this.logger.trace(`Opening WS connection to URL: ${url}`, {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
      });
      const socket = new this.options.webSocketConstructor(url);
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
        this.releaseSocket(wsKey, socket, { close: true, force: true });
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
      this.logger.trace(
        'WS not connected - requests queued for retry once connected.',
        { ...this.WS_LOGGER_CATEGORY, wsKey, wsTopicRequests: added },
      );
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
    try {
      this.logger.trace('Sending upstream ws message: ', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
        wsMessage: message,
      });
      if (!socket || !this.wsStore.isWsOpen(wsKey)) {
        throw new HyperliquidWebSocketError(
          'The Hyperliquid WebSocket connection is not open.',
        );
      }
      socket.send(message);
    } catch (error) {
      this.logger.error('Failed to send WS message', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
        wsMessage: message,
        exception: error,
      });
      this.emitEvent('exception', { wsKey, event: error });
      if (socket) {
        this.onWsDisconnect(
          wsKey,
          socket,
          error,
          this.requestSendError(error),
          true,
        );
      }
      throw error;
    }
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
    const abort = () => {
      this.wsStore.rejectDeferredPromise(
        wsKey,
        id,
        new HyperliquidWebSocketError('WebSocket request was aborted.'),
      );
    };
    pending.cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener?.('abort', abort);
    };
    options.signal?.addEventListener?.('abort', abort, { once: true });

    this.logger.trace(`sendWSAPIRequest(): assert "${wsKey}" is connected`, {
      ...this.WS_LOGGER_CATEGORY,
      wsKey,
      promiseRef: id,
    });
    void this.connectWebsocket(wsKey)
      .then(() => {
        // A timed-out, cancelled or closed request must never be sent after opening.
        if (this.wsStore.getDeferredPromise(wsKey, id) === pending) {
          this.tryWsSend(wsKey, JSON.stringify(payload));
          this.logger.trace(
            `sendWSAPIRequest(): sent event with promiseRef(${id})`,
            {
              ...this.WS_LOGGER_CATEGORY,
              wsKey,
              promiseRef: id,
            },
          );
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
    if (
      state.connectionState === WsConnectionStateEnum.CLOSING &&
      state.ws?.readyState === 2
    ) {
      return;
    }
    const alreadyClosed =
      !state.ws && state.connectionState === WsConnectionStateEnum.INITIAL;
    if (!alreadyClosed) {
      this.logger.info('Closing connection', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
      });
    }
    state.connectionState = WsConnectionStateEnum.CLOSING;
    this.clearTimers(state);
    const error = new HyperliquidWebSocketError(
      'The Hyperliquid WebSocket client was closed.',
    );
    this.rejectConnection(state, error);
    this.wsStore.rejectAllDeferredPromises(wsKey, error);
    state.subscribedTopics.clear();
    state.messageQueue = undefined;
    const socket = state.ws;
    if (socket) {
      this.releaseSocket(wsKey, socket, {
        close: true,
        onClose: (event) => {
          // A late close from a replaced socket must not close the new connection.
          if (this.wsStore.get(wsKey) !== state) return;
          this.wsStore.delete(wsKey);
          this.emitEvent('close', { wsKey, event });
        },
      });
      return;
    }
    // Cancel a queued reconnect even when there is no socket left to close.
    this.wsStore.delete(wsKey);
    if (alreadyClosed) return;
    this.emitEvent('close', {
      wsKey,
      event: { code: 1000, reason: 'Client closed' },
    });
  }

  closeAll(): void {
    const keys = this.wsStore.getKeys();
    if (keys.length) {
      this.logger.info(`Closing all ws connections: ${keys}`, {
        ...this.WS_LOGGER_CATEGORY,
      });
    }
    for (const wsKey of keys) {
      this.closeWebsocket(wsKey);
    }
  }

  protected emitException(
    wsKey: TWsKey,
    event: unknown,
    message = 'WebSocket exception',
  ): void {
    this.logger.error(message, {
      ...this.WS_LOGGER_CATEGORY,
      wsKey,
      error: event,
    });
    this.emitEvent('exception', { event, wsKey });
  }

  protected emitEvent<K extends keyof WebsocketClientEventMap<TWsKey>>(
    eventType: K,
    event: WebsocketClientEventMap<TWsKey>[K][0],
  ): void {
    if (
      eventType === 'message' ||
      eventType === 'response' ||
      eventType === 'exception'
    ) {
      this.logger.trace(`onWsMessage().emit(${eventType})`, {
        ...this.WS_LOGGER_CATEGORY,
        wsKey: event.wsKey,
        event,
      });
    }
    try {
      this.emit(eventType, ...([event] as WebsocketClientEventMap<TWsKey>[K]));
    } catch (error) {
      this.logger.error(
        `Exception in onWsMessage().emit(${eventType}) handler:`,
        { ...this.WS_LOGGER_CATEGORY, wsKey: event.wsKey, error },
      );
      if (eventType !== 'exception') {
        this.emitEvent('exception', { wsKey: event.wsKey, event: error });
      }
    }
  }

  private getOrCreateState(wsKey: TWsKey): WsStoredState<TTopic> {
    let existing = this.wsStore.get(wsKey);
    if (existing?.connectionState === WsConnectionStateEnum.CLOSING) {
      if (existing.ws && existing.ws.readyState < 2) {
        throw new HyperliquidWebSocketError(
          'The previous WebSocket connection could not close. Retry close() before reconnecting.',
        );
      }
      this.wsStore.delete(wsKey);
      existing = undefined;
    }
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
      const requests = this.getWsRequestEvents(wsKey, operation, topics);
      const action =
        operation === 'subscribe' ? 'Subscribing' : 'Unsubscribing';
      this.logger.trace(
        `${action} to ${topics.length} "${wsKey}" topics in ${requests.length} batches.`,
        { ...this.WS_LOGGER_CATEGORY, wsKey, wsTopicRequests: topics },
      );
      for (const request of requests) {
        this.tryWsSend(wsKey, JSON.stringify(request));
      }
      this.logger.trace(
        `Finished ${action.toLowerCase()} to ${topics.length} "${wsKey}" topics in ${requests.length} batches.`,
        { ...this.WS_LOGGER_CATEGORY, wsKey },
      );
    } catch (error) {
      // Recover from a failed send using the desired topic cache. Otherwise a
      // deduplicated retry could incorrectly assume this topic was already sent.
      if (socket && this.isCurrentConnection(wsKey, socket)) {
        this.emitException(wsKey, error, 'Failed to send WS message');
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
    const eventType = state.hasOpened ? 'reconnected' : 'open';
    this.logger.info(
      eventType === 'open' ? 'Websocket connected' : 'Websocket reconnected',
      { ...this.WS_LOGGER_CATEGORY, wsKey, wsUrl: this.getWsUrl(wsKey) },
    );

    try {
      this.requestTopics(wsKey, 'subscribe', this.wsStore.getTopics(wsKey));
    } catch (error) {
      this.onWsDisconnect(wsKey, socket, error, error, true);
      return;
    }

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
            this.logger.trace('Received PONG event', {
              ...this.WS_LOGGER_CATEGORY,
              wsKey,
              eventData: message,
              source: 'event',
            });
            clearTimeout(state.activePongTimer);
            state.activePongTimer = undefined;
          } else {
            this.emitEvent(event.eventType, event.event);
          }
        }
      } catch (error) {
        this.emitException(wsKey, error, 'Failed to parse ws event message');
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
              this.emitException(
                wsKey,
                error,
                'Failed to parse ws event message',
              );
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
      this.emitException(wsKey, error, 'Failed to parse ws event message');
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
    if (!closeSocket) {
      this.logger.info('Websocket connection closed', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
        event,
      });
    }
    const state = this.wsStore.get(wsKey, true);
    const wasConnecting = Boolean(state.connectionInProgress);
    // Without recovery, keep the closing socket reachable until close is confirmed.
    const waitingForClose = closeSocket && !this.options.autoReconnect;
    state.ws = waitingForClose ? socket : undefined;
    state.messageQueue = undefined;
    this.clearTimers(state);
    this.rejectConnection(state, error);
    this.wsStore.rejectAllDeferredPromises(
      wsKey,
      wasConnecting ? this.requestSendError(error) : error,
    );
    state.connectionState = waitingForClose
      ? WsConnectionStateEnum.ERROR
      : WsConnectionStateEnum.INITIAL;
    this.releaseSocket(wsKey, socket, {
      close: closeSocket,
      force: true,
      onClose: (closeEvent) => {
        if (
          !this.options.autoReconnect &&
          this.wsStore.get(wsKey) === state &&
          state.ws === socket
        ) {
          state.ws = undefined;
          state.connectionState = WsConnectionStateEnum.INITIAL;
          this.emitEvent('close', { event: closeEvent, wsKey });
        }
      },
    });
    if (this.options.autoReconnect) {
      this.scheduleReconnect(wsKey, state, event);
    } else if (!closeSocket) {
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
    this.logger.info('Reconnecting to websocket with delay...', {
      ...this.WS_LOGGER_CATEGORY,
      wsKey,
      connectionDelayMs: delay,
      attempt: state.reconnectAttempts,
      cause: event,
    });
    state.activeReconnectTimer = setTimeout(() => {
      state.activeReconnectTimer = undefined;
      if (this.wsStore.get(wsKey) !== state) {
        return;
      }
      this.logger.info('Reconnecting to websocket', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
        attempt: state.reconnectAttempts,
      });
      void this.connectWebsocket(wsKey).catch((error) => {
        this.logger.trace('WebSocket reconnect attempt failed', {
          ...this.WS_LOGGER_CATEGORY,
          wsKey,
          error,
        });
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
      this.logger.trace('Disabled client-to-server ping timer', {
        ...this.WS_LOGGER_CATEGORY,
        wsKey,
      });
      return;
    }

    this.logger.trace('Enabled ping timer', {
      ...this.WS_LOGGER_CATEGORY,
      wsKey,
      pingInterval: this.options.pingInterval,
      pongTimeout: this.options.pongTimeout,
    });
    state.activePingTimer = setInterval(() => {
      if (
        !this.isCurrentConnection(wsKey, socket) ||
        socket.readyState !== 1 ||
        state.activePongTimer !== undefined
      ) {
        return;
      }
      try {
        this.logger.trace('Sending ping', {
          ...this.WS_LOGGER_CATEGORY,
          wsKey,
        });
        if (!this.sendPingEvent(wsKey)) {
          this.logger.trace('Ping was not sent; pong timeout not started', {
            ...this.WS_LOGGER_CATEGORY,
            wsKey,
          });
          return;
        }
        if (this.options.pongTimeout === 0) {
          return;
        }
        state.activePongTimer = setTimeout(() => {
          const error = new HyperliquidWebSocketError(
            'WebSocket heartbeat timed out.',
          );
          this.logger.info(
            this.options.autoReconnect
              ? 'Pong timeout - closing socket to reconnect'
              : 'Pong timeout - closing socket',
            {
              ...this.WS_LOGGER_CATEGORY,
              wsKey,
              reason: 'Pong timeout',
              pongTimeout: this.options.pongTimeout,
            },
          );
          this.onWsDisconnect(wsKey, socket, error, error, true);
        }, this.options.pongTimeout);
      } catch (error) {
        if (this.isCurrentConnection(wsKey, socket)) {
          this.emitException(wsKey, error, 'Failed to send ping');
          this.onWsDisconnect(wsKey, socket, error, error, true);
        }
      }
    }, this.options.pingInterval);
  }

  private isCurrentConnection(wsKey: TWsKey, socket: WebSocketLike): boolean {
    const state = this.wsStore.get(wsKey);
    return (
      state?.ws === socket &&
      (state.connectionState === WsConnectionStateEnum.CONNECTING ||
        state.connectionState === WsConnectionStateEnum.CONNECTED)
    );
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
    wsKey: TWsKey,
    socket: WebSocketLike,
    options: {
      close?: boolean;
      force?: boolean;
      onClose?: (event: WebSocketCloseEvent) => void;
    } = {},
  ): void {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    // Node's ws may report an expected abort error while closing a connecting socket.
    // Keep a handler on this retired socket so that its error cannot become unhandled.
    socket.onerror = () => undefined;
    if (options.close) {
      const onClose = (event: WebSocketCloseEvent) => {
        if (socket.onclose !== onClose) return;
        socket.onclose = null;
        this.logger.info('Websocket connection closed', {
          ...this.WS_LOGGER_CATEGORY,
          wsKey,
          event,
        });
        options.onClose?.(event);
      };
      socket.onclose = onClose;
      if (socket.readyState === 3) {
        onClose({});
        return;
      }
      try {
        if (options.force && socket.terminate) {
          socket.terminate();
        } else {
          socket.close(1000, 'Client closed');
        }
      } catch (error) {
        this.emitException(
          wsKey,
          error,
          'Failed to close a WebSocket connection',
        );
        // Node can still release a socket if graceful close failed.
        if (!options.force && socket.terminate) {
          try {
            socket.terminate();
          } catch (terminateError) {
            this.emitException(
              wsKey,
              terminateError,
              'Failed to terminate a WebSocket connection',
            );
          }
        }
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
