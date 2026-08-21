import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import {
  DefaultLogger,
  type DefaultLogger as Logger,
} from './lib/websocket/logger.js';
import { RestClient } from './RestClient.js';
import type { RequestOptions } from './types/shared.types.js';
import type {
  WebsocketAPIClientOptions,
  WebsocketLifecycleCallback,
  WebsocketLifecycleEvent,
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

  on(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    this.wsClient.on(event, callback);
    return this;
  }

  once(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    this.wsClient.once(event, callback);
    return this;
  }

  off(
    event: WebsocketLifecycleEvent,
    callback: WebsocketLifecycleCallback,
  ): this {
    this.wsClient.off(event, callback);
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

  protected override post<T>(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const endpoint =
      path === '/info' ? 'info' : path === '/exchange' ? 'action' : undefined;
    if (!endpoint) {
      return Promise.reject(
        new HyperliquidWebSocketError(
          `WebSocket POST does not support path "${path}".`,
        ),
      );
    }

    return this.wsClient.sendWSAPIRequest<T>(endpoint, body, options);
  }
}
