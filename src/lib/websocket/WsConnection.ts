import DefaultWebSocket from 'isomorphic-ws';

import type {
  WebSocketConstructor,
  WebSocketLike,
  WebSocketMessageEvent,
} from '../../types/websockets/ws-portable.js';
import { HyperliquidWebSocketError } from './errors.js';

type ConnectionEvent = 'close' | 'error' | 'message' | 'open' | 'reconnect';
type ConnectionListener = (value?: unknown) => void;

export interface WsConnectionOptions {
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  maxReconnectDelayMs?: number;
  reconnectDelayMs?: number;
  webSocketConstructor?: WebSocketConstructor;
}

function messageDataToString(
  data: WebSocketMessageEvent['data'],
): Promise<string> {
  if (typeof data === 'string') {
    return Promise.resolve(data);
  }
  if (data instanceof Blob) {
    return data.text();
  }
  if (ArrayBuffer.isView(data)) {
    return Promise.resolve(
      new TextDecoder().decode(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      ),
    );
  }
  return Promise.resolve(new TextDecoder().decode(new Uint8Array(data)));
}

export class WsConnection {
  private readonly autoReconnect: boolean;

  private connectPromise: Promise<void> | undefined;

  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  private hasOpened = false;

  private readonly heartbeatIntervalMs: number;

  private readonly heartbeatTimeoutMs: number;

  private readonly listeners = new Map<
    ConnectionEvent,
    Set<ConnectionListener>
  >();

  private manuallyClosed = false;

  private readonly maxReconnectDelayMs: number;

  private reconnectAttempts = 0;

  private readonly reconnectDelayMs: number;

  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  private pongTimer: ReturnType<typeof setTimeout> | undefined;

  private socket: WebSocketLike | undefined;

  private readonly WebSocketImpl: WebSocketConstructor;

  constructor(
    readonly url: string,
    options: WsConnectionOptions = {},
  ) {
    this.autoReconnect = options.autoReconnect !== false;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 10_000;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 500;
    this.WebSocketImpl =
      options.webSocketConstructor ??
      (DefaultWebSocket as unknown as WebSocketConstructor);
  }

  get isOpen(): boolean {
    return this.socket?.readyState === 1;
  }

  connect(): Promise<void> {
    if (this.isOpen) {
      return Promise.resolve();
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.manuallyClosed = false;
    this.clearReconnectTimer();
    const wasReconnect = this.hasOpened;
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let opened = false;

      socket.onopen = () => {
        if (this.socket !== socket) {
          return;
        }

        opened = true;
        this.connectPromise = undefined;
        this.hasOpened = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
        this.emit(wasReconnect ? 'reconnect' : 'open');
      };

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handlePong(event.data);
          this.emit('message', event.data);
          return;
        }
        void messageDataToString(event.data)
          .then((message) => {
            this.handlePong(message);
            this.emit('message', message);
          })
          .catch((error) => this.emit('error', error));
      };

      socket.onerror = (event) => {
        this.emit('error', event);
        if (!opened) {
          this.connectPromise = undefined;
          reject(
            new HyperliquidWebSocketError(
              'The Hyperliquid WebSocket connection failed.',
              { cause: event },
            ),
          );
        }
      };

      socket.onclose = (event) => {
        if (this.socket !== socket) {
          return;
        }

        this.socket = undefined;
        this.connectPromise = undefined;
        this.stopHeartbeat();
        if (!opened) {
          reject(
            new HyperliquidWebSocketError(
              'The Hyperliquid WebSocket connection closed before opening.',
              { cause: event },
            ),
          );
        }
        this.emit('close', event);
        this.scheduleReconnect();
      };
    });

    return this.connectPromise;
  }

  async send(payload: unknown): Promise<void> {
    await this.connect();
    this.sendNow(payload);
  }

  sendNow(payload: unknown): void {
    if (!this.socket || !this.isOpen) {
      throw new HyperliquidWebSocketError(
        'The Hyperliquid WebSocket connection is not open.',
        { request: payload },
      );
    }
    this.socket.send(JSON.stringify(payload));
  }

  on(event: ConnectionEvent, listener: ConnectionListener): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  close(code = 1000, reason = 'Client closed'): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    const socket = this.socket;
    socket?.close(code, reason);
  }

  private emit(event: ConnectionEvent, value?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(value);
      } catch (error) {
        if (event !== 'error') {
          this.emit('error', error);
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (this.heartbeatIntervalMs <= 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isOpen) {
        this.socket?.send(JSON.stringify({ method: 'ping' }));
        this.armPongTimeout();
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    this.clearPongTimeout();
  }

  private armPongTimeout(): void {
    if (this.heartbeatTimeoutMs <= 0 || this.pongTimer) {
      return;
    }
    this.pongTimer = setTimeout(() => {
      this.pongTimer = undefined;
      this.socket?.close(4000, 'Heartbeat timeout');
    }, this.heartbeatTimeoutMs);
  }

  private clearPongTimeout(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
    }
  }

  private handlePong(message: string): void {
    try {
      const value = JSON.parse(message) as { channel?: unknown };
      if (value.channel === 'pong') {
        this.clearPongTimeout();
      }
    } catch {
      // Non-JSON messages are handled by the client.
    }
  }

  private scheduleReconnect(): void {
    if (
      this.manuallyClosed ||
      !this.autoReconnect ||
      this.reconnectTimer !== undefined
    ) {
      return;
    }

    const delay = Math.min(
      this.maxReconnectDelayMs,
      this.reconnectDelayMs * 2 ** this.reconnectAttempts,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect().catch(() => undefined);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
