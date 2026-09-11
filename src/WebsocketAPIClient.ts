import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import {
  DefaultLogger,
  type DefaultLogger as Logger,
} from './lib/websocket/logger.js';
import { RestClient } from './RestClient.js';
import type {
  WebsocketAPIClientOptions,
  WebsocketClientEventMap,
} from './types/websockets/ws-general.js';
import { WebsocketClient } from './WebsocketClient.js';

export class WebsocketAPIClient extends RestClient {
  private readonly wsClient: WebsocketClient;

  constructor(
    options: WebsocketAPIClientOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super(options);
    this.wsClient = new WebsocketClient(options, logger);
  }

  getWSClient(): WebsocketClient {
    return this.wsClient;
  }

  connect(): Promise<void> {
    return this.wsClient.connect('api');
  }

  on<K extends keyof WebsocketClientEventMap>(
    event: K,
    listener: (...args: WebsocketClientEventMap[K]) => void,
  ): this {
    this.wsClient.on(event, listener);
    return this;
  }

  once<K extends keyof WebsocketClientEventMap>(
    event: K,
    listener: (...args: WebsocketClientEventMap[K]) => void,
  ): this {
    this.wsClient.once(event, listener);
    return this;
  }

  off<K extends keyof WebsocketClientEventMap>(
    event: K,
    listener: (...args: WebsocketClientEventMap[K]) => void,
  ): this {
    this.wsClient.off(event, listener);
    return this;
  }

  isConnected(): boolean {
    return this.wsClient.isConnected('api');
  }

  close(): void {
    this.wsClient.closeAll();
  }

  closeAll(): void {
    this.close();
  }

  protected override post<T>(path: string, body: unknown): Promise<T> {
    const endpoint =
      path === '/info' ? 'info' : path === '/exchange' ? 'action' : undefined;
    if (!endpoint) {
      return Promise.reject(
        new HyperliquidWebSocketError(
          `WebSocket POST does not support path "${path}".`,
        ),
      );
    }

    return this.wsClient.sendWSAPIRequest<T>(endpoint, body);
  }
}
