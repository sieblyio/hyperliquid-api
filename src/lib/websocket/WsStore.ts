import type { WebSocketLike } from '../../types/websockets/ws-portable.js';
import {
  type DeferredPromise,
  WsConnectionStateEnum,
  type WsStoredState,
} from './WsStore.types.js';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { cleanup: () => undefined, promise, reject, resolve };
}

/** Connection and topic store, following the shared BaseWSClient/WsStore pattern. */
export class WsStore<TWsKey extends string, TTopic extends object> {
  private readonly wsState = new Map<TWsKey, WsStoredState<TTopic>>();

  get(key: TWsKey, createIfMissing: true): WsStoredState<TTopic>;

  get(key: TWsKey, createIfMissing?: false): WsStoredState<TTopic> | undefined;

  get(key: TWsKey, createIfMissing = false): WsStoredState<TTopic> | undefined {
    let state = this.wsState.get(key);
    if (!state && createIfMissing) {
      state = {
        connectionState: WsConnectionStateEnum.INITIAL,
        deferredPromiseStore: new Map(),
        hasOpened: false,
        reconnectAttempts: 0,
        subscribedTopics: new Map(),
      };
      this.wsState.set(key, state);
    }
    return state;
  }

  getKeys(): TWsKey[] {
    return [...this.wsState.keys()];
  }

  delete(key: TWsKey): void {
    this.wsState.delete(key);
  }

  getWs(key: TWsKey): WebSocketLike | undefined {
    return this.get(key)?.ws;
  }

  isWsOpen(key: TWsKey): boolean {
    return this.getWs(key)?.readyState === 1;
  }

  addTopic(key: TWsKey, topic: TTopic): boolean {
    const topics = this.get(key, true).subscribedTopics;
    const id = JSON.stringify(stableValue(topic));
    if (topics.has(id)) {
      return false;
    }
    topics.set(id, topic);
    return true;
  }

  deleteTopic(key: TWsKey, topic: TTopic): boolean {
    return (
      this.get(key)?.subscribedTopics.delete(
        JSON.stringify(stableValue(topic)),
      ) ?? false
    );
  }

  getTopics(key: TWsKey): TTopic[] {
    return [...(this.get(key)?.subscribedTopics.values() ?? [])];
  }

  createDeferredPromise(key: TWsKey, id: string): DeferredPromise {
    const requests = this.get(key, true).deferredPromiseStore;
    if (requests.has(id)) {
      throw new Error(`WebSocket request ${id} is already pending.`);
    }
    const pending = createDeferredPromise<unknown>();
    requests.set(id, pending);
    return pending;
  }

  getDeferredPromise(key: TWsKey, id: string): DeferredPromise | undefined {
    return this.get(key)?.deferredPromiseStore.get(id);
  }

  resolveDeferredPromise(key: TWsKey, id: string, value: unknown): void {
    const pending = this.getDeferredPromise(key, id);
    if (pending) {
      this.get(key)?.deferredPromiseStore.delete(id);
      pending.cleanup();
      pending.resolve(value);
    }
  }

  rejectDeferredPromise(key: TWsKey, id: string, error: unknown): void {
    const pending = this.getDeferredPromise(key, id);
    if (pending) {
      this.get(key)?.deferredPromiseStore.delete(id);
      pending.cleanup();
      pending.reject(error);
    }
  }

  rejectAllDeferredPromises(key: TWsKey, error: unknown): void {
    for (const id of this.get(key)?.deferredPromiseStore.keys() ?? []) {
      this.rejectDeferredPromise(key, id, error);
    }
  }
}
