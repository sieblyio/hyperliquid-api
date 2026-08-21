import type {
  RestClientNetworkOptions,
  RestClientOptions,
} from '../shared.types.js';
import type { WebSocketConstructor } from './ws-portable.js';

export interface WebsocketClientOptions {
  assetCacheTtlMs?: number;
  autoReconnect?: boolean;
  baseUrl?: string;
  maxReconnectTimeout?: number;
  pingInterval?: number;
  pongTimeout?: number;
  reconnectTimeout?: number;
  requestTimeoutMs?: number;
  requestOptions?: RestClientNetworkOptions;
  testnet?: boolean;
  webSocketConstructor?: WebSocketConstructor;
  wsUrl?: string;
}

export type WebsocketAPIClientOptions = RestClientOptions &
  Omit<WebsocketClientOptions, keyof RestClientOptions>;

export type WebsocketLifecycleEvent =
  'close' | 'exception' | 'open' | 'reconnected' | 'reconnecting';

export interface WebsocketLifecycleContext {
  wsKey: string;
  event?: unknown;
}

export type WebsocketLifecycleCallback = (
  context: WebsocketLifecycleContext,
) => void;
