import type { RestClientOptions } from '../shared.types.js';
import type { WebSocketConstructor } from './ws-portable.js';

export interface WebsocketClientOptions extends Pick<
  RestClientOptions,
  'assetCacheTtlMs' | 'baseUrl' | 'timeout'
> {
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  maxReconnectDelayMs?: number;
  reconnectDelayMs?: number;
  testnet?: boolean;
  webSocketConstructor?: WebSocketConstructor;
  wsUrl?: string;
}

export type WebsocketAPIClientOptions = RestClientOptions &
  Omit<WebsocketClientOptions, keyof RestClientOptions> & {
    requestTimeoutMs?: number;
  };

export type WebsocketLifecycleEvent = 'close' | 'error' | 'open' | 'reconnect';

export interface WebsocketLifecycleContext {
  connectionKey: string;
  event?: unknown;
}
