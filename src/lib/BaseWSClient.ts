import type {
  WebsocketLifecycleCallback,
  WebsocketLifecycleContext,
  WebsocketLifecycleEvent,
} from '../types/websockets/ws-general.js';
import type { DefaultLogger } from './websocket/logger.js';
import { DefaultLogger as DefaultLoggerInstance } from './websocket/logger.js';
import type { WsConnectionOptions } from './websocket/WsConnection.js';
import { WsConnection } from './websocket/WsConnection.js';

const MAX_CONNECTIONS = 10;

export abstract class BaseWebsocketClient {
  protected readonly logger: DefaultLogger;

  private readonly connectionOptions: WsConnectionOptions;

  private readonly connections = new Map<string, WsConnection>();

  private readonly lifecycleListeners = new Map<
    WebsocketLifecycleEvent,
    Set<WebsocketLifecycleCallback>
  >();

  protected constructor(
    connectionOptions: WsConnectionOptions = {},
    logger: DefaultLogger = DefaultLoggerInstance,
  ) {
    this.connectionOptions = connectionOptions;
    this.logger = logger;
  }

  on(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    const listeners = this.lifecycleListeners.get(event) ?? new Set();
    listeners.add(callback);
    this.lifecycleListeners.set(event, listeners);
    return this;
  }

  once(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    const onceCallback: WebsocketLifecycleCallback = (context) => {
      this.off(event, onceCallback);
      callback(context);
    };
    return this.on(event, onceCallback);
  }

  off(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    this.lifecycleListeners.get(event)?.delete(callback);
    return this;
  }

  isConnected(wsKey = 'public'): boolean {
    return this.connections.get(wsKey)?.isOpen === true;
  }

  close(wsKey?: string): void {
    if (wsKey === undefined) {
      this.closeAll();
      return;
    }

    this.connections.get(wsKey)?.close();
    this.connections.delete(wsKey);
    this.onConnectionRemoved(wsKey);
  }

  closeAll(): void {
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();
    this.onAllConnectionsRemoved();
  }

  protected connectWebsocket(wsKey: string): Promise<void> {
    return this.getWsConnection(wsKey).connect();
  }

  protected getWsConnection(wsKey: string): WsConnection {
    const existing = this.connections.get(wsKey);
    if (existing) {
      return existing;
    }
    if (this.connections.size >= MAX_CONNECTIONS) {
      throw new Error(
        `Hyperliquid allows at most ${MAX_CONNECTIONS} WebSocket connections per IP address.`,
      );
    }

    const connection = new WsConnection(
      this.getWsUrl(wsKey),
      this.connectionOptions,
    );
    connection.on('open', () => {
      this.onConnectionOpen(wsKey);
      this.emitLifecycle('open', { wsKey });
    });
    connection.on('reconnecting', (event) => {
      this.emitLifecycle('reconnecting', { event, wsKey });
    });
    connection.on('reconnected', () => {
      this.onConnectionReconnected(wsKey);
      this.emitLifecycle('reconnected', { wsKey });
    });
    connection.on('close', (event) => {
      this.onConnectionClose(wsKey, event);
      this.emitLifecycle('close', { event, wsKey });
    });
    connection.on('error', (event) => {
      this.emitLifecycle('exception', { event, wsKey });
    });
    connection.on('message', (message) => {
      this.onConnectionMessage(wsKey, message);
    });
    this.connections.set(wsKey, connection);
    return connection;
  }

  protected emitLifecycle(
    event: WebsocketLifecycleEvent,
    context: WebsocketLifecycleContext,
  ): void {
    if (event === 'exception') {
      this.logger.error('WebSocket exception', context.wsKey, context.event);
    } else {
      this.logger.trace('WebSocket lifecycle', event, context.wsKey);
    }

    for (const callback of this.lifecycleListeners.get(event) ?? []) {
      try {
        callback(context);
      } catch (error) {
        this.logger.error('WebSocket lifecycle listener failed', error);
        if (event !== 'exception') {
          this.emitLifecycle('exception', {
            event: error,
            wsKey: context.wsKey,
          });
        }
      }
    }
  }

  protected abstract getWsUrl(wsKey: string): string;

  protected abstract onConnectionMessage(wsKey: string, message: unknown): void;

  protected onConnectionOpen(_wsKey: string): void {
    void _wsKey;
  }

  protected onConnectionReconnected(_wsKey: string): void {
    void _wsKey;
  }

  protected onConnectionClose(_wsKey: string, _event: unknown): void {
    void _wsKey;
    void _event;
  }

  protected onConnectionRemoved(_wsKey: string): void {
    void _wsKey;
  }

  protected onAllConnectionsRemoved(): void {}
}
