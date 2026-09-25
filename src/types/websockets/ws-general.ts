import type {
  RestClientNetworkOptions,
  RestClientOptions,
} from '../shared.types.js';
import type {
  WebsocketMessageEvent,
  WebsocketResponseEvent,
} from './ws-events.js';
import type { WebSocketConstructor, WebSocketLike } from './ws-portable.js';

export type WsKey = 'api' | 'public' | `user:${string}`;

export interface WebsocketClientOptions {
  assetCacheTtlMs?: number;
  /** Reconnect automatically after an unexpected disconnect. Default: true. */
  autoReconnect?: boolean;
  baseUrl?: string;
  /** Maximum time to open a connection, in milliseconds. Default: 1,000. */
  connectionTimeout?: number;
  /** Maximum reconnect delay in milliseconds. Default: 10,000. Zero means no delay. */
  maxReconnectTimeout?: number;
  /** Ping interval in milliseconds. Default: 10,000. Zero disables pings. */
  pingInterval?: number;
  /** Pong deadline in milliseconds. Default: 1,000. Zero disables the deadline. */
  pongTimeout?: number;
  /** Initial reconnect delay in milliseconds. Default: 500. Zero means no delay. */
  reconnectTimeout?: number;
  /** Maximum request duration in milliseconds, including connection setup. Default: 10,000. */
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

export interface WebsocketLifecycleContext<TWsKey extends string = WsKey> {
  wsKey: TWsKey;
  event?: unknown;
}

export interface WebsocketConnectionContext<
  TWsKey extends string = WsKey,
> extends WebsocketLifecycleContext<TWsKey> {
  ws: WebSocketLike;
  wsUrl: string;
}

export interface WebsocketExceptionEvent<
  TWsKey extends string = WsKey,
> extends WebsocketLifecycleContext<TWsKey> {
  channel?: 'error' | 'post';
  data?: unknown;
}

/** Argument tuples for the standard EventEmitter API. */
export interface WebsocketClientEventMap<TWsKey extends string = WsKey> {
  open: [event: WebsocketConnectionContext<TWsKey>];
  reconnecting: [event: WebsocketLifecycleContext<TWsKey>];
  reconnected: [event: WebsocketConnectionContext<TWsKey>];
  close: [event: WebsocketLifecycleContext<TWsKey>];
  message: [event: WebsocketMessageEvent<TWsKey>];
  response: [event: WebsocketResponseEvent<TWsKey>];
  exception: [event: WebsocketExceptionEvent<TWsKey>];
}

export type WebsocketLifecycleCallback = (
  context: WebsocketLifecycleContext,
) => void;
