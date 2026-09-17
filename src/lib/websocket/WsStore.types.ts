import type { WebSocketLike } from '../../types/websockets/ws-portable.js';

export const WsConnectionStateEnum = {
  INITIAL: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  CLOSING: 3,
  RECONNECTING: 4,
  ERROR: 5,
} as const;

export type WsConnectionState =
  (typeof WsConnectionStateEnum)[keyof typeof WsConnectionStateEnum];

export interface DeferredPromise<T = unknown> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
  cleanup(): void;
}

/** One entry owns all retained state for a physical WebSocket connection. */
export interface WsStoredState<TTopic extends object> {
  ws?: WebSocketLike | undefined;
  connectionState: WsConnectionState;
  connectionInProgress?: DeferredPromise<void> | undefined;
  activeConnectionTimer?: ReturnType<typeof setTimeout> | undefined;
  activePingTimer?: ReturnType<typeof setInterval> | undefined;
  activePongTimer?: ReturnType<typeof setTimeout> | undefined;
  activeReconnectTimer?: ReturnType<typeof setTimeout> | undefined;
  messageQueue?: Promise<void> | undefined;
  deferredPromiseStore: Map<string, DeferredPromise>;
  subscribedTopics: Map<string, TTopic>;
  hasOpened: boolean;
  reconnectAttempts: number;
}
