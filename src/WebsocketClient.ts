import { inflateSync, strFromU8 } from 'fflate';

import { MAINNET_WS_URL, TESTNET_WS_URL } from './constants.js';
import type { ResolvedAsset } from './lib/asset-resolver.js';
import { normalizeAddresses } from './lib/normalize-addresses.js';
import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import {
  WsConnection,
  type WsConnectionOptions,
} from './lib/websocket/WsConnection.js';
import { sanitizeObjectForWire } from './lib/wire.js';
import { RestClient } from './RestClient.js';
import type {
  WebsocketClientOptions,
  WebsocketLifecycleContext,
  WebsocketLifecycleEvent,
} from './types/websockets/ws-general.js';
import type {
  WebsocketCallback,
  WebsocketEventFor,
  WebsocketSubscription,
  WebsocketSubscriptionHandle,
} from './types/websockets/ws-subscriptions.js';

type UntypedCallback = (data: unknown) => void;
type LifecycleCallback = (context: WebsocketLifecycleContext) => void;

interface SubscriptionEntry {
  callbacks: Set<UntypedCallback>;
  subscription: WebsocketSubscription;
}

interface ConnectionContext {
  connection: WsConnection;
  connectionKey: string;
  subscriptions: Map<string, SubscriptionEntry>;
}

const DEX_DEFAULT_SUBSCRIPTIONS = new Set([
  'assetCtxs',
  'clearinghouseState',
  'openOrders',
  'twapStates',
]);

const USER_UNSCOPED_CHANNELS = new Set([
  'notification',
  'orderUpdates',
  'userEvents',
]);

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

function subscriptionId(subscription: WebsocketSubscription): string {
  return JSON.stringify(stableValue(subscription));
}

function normalizeSubscriptionFields<S extends WebsocketSubscription>(
  subscription: S,
): S {
  const normalized = normalizeAddresses(
    sanitizeObjectForWire({ ...subscription }),
  );
  if (
    DEX_DEFAULT_SUBSCRIPTIONS.has(normalized.type as string) &&
    normalized.dex === undefined
  ) {
    normalized.dex = '';
  }
  if (normalized.type === 'allMids' && normalized.dex === '') {
    delete normalized.dex;
  }
  if (
    normalized.type === 'userFills' &&
    normalized.aggregateByTime === undefined
  ) {
    normalized.aggregateByTime = false;
  }
  return normalized as S;
}

function channelMatches(
  subscription: WebsocketSubscription,
  channel: string,
): boolean {
  if (subscription.type === 'userEvents') {
    return channel === 'user';
  }
  if (subscription.type === 'activeAssetCtx') {
    return channel === 'activeAssetCtx' || channel === 'activeSpotAssetCtx';
  }
  return channel === subscription.type;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function eventMatches(
  subscription: WebsocketSubscription,
  data: unknown,
): boolean {
  const record = recordValue(data);
  const first = Array.isArray(data) ? recordValue(data[0]) : undefined;
  const eventCoin = record?.coin ?? record?.s ?? first?.coin;
  if ('coin' in subscription && eventCoin !== undefined) {
    if (eventCoin !== subscription.coin) {
      return false;
    }
  }

  if ('interval' in subscription && record?.i !== undefined) {
    if (record.i !== subscription.interval) {
      return false;
    }
  }

  if ('dex' in subscription) {
    const expectedDex = subscription.dex ?? '';
    const eventDex = record?.dex ?? '';
    if (eventDex !== expectedDex) {
      return false;
    }
  }

  if ('user' in subscription) {
    const userState = recordValue(record?.userState);
    const eventUser = record?.user ?? userState?.user;
    if (
      typeof eventUser === 'string' &&
      eventUser.toLowerCase() !== subscription.user.toLowerCase()
    ) {
      return false;
    }
  }

  return true;
}

function decompressFastAssetCtxs(data: unknown): unknown {
  if (typeof data !== 'string') {
    throw new HyperliquidWebSocketError(
      'fastAssetCtxs data must be a base64 string.',
    );
  }
  const encoded = atob(data);
  const compressed = Uint8Array.from(encoded, (character) =>
    character.charCodeAt(0),
  );
  return JSON.parse(strFromU8(inflateSync(compressed)));
}

export class WebsocketClient {
  private readonly connectionOptions: WsConnectionOptions;

  private readonly connections = new Map<string, ConnectionContext>();

  private readonly metadataClient: RestClient;

  private readonly lifecycleListeners = new Map<
    WebsocketLifecycleEvent,
    Set<LifecycleCallback>
  >();

  private readonly wsUrl: string;

  constructor(options: WebsocketClientOptions = {}) {
    this.wsUrl =
      options.wsUrl ??
      (options.testnet === true ? TESTNET_WS_URL : MAINNET_WS_URL);
    this.connectionOptions = {
      ...(options.autoReconnect === undefined
        ? {}
        : { autoReconnect: options.autoReconnect }),
      ...(options.heartbeatIntervalMs === undefined
        ? {}
        : { heartbeatIntervalMs: options.heartbeatIntervalMs }),
      ...(options.heartbeatTimeoutMs === undefined
        ? {}
        : { heartbeatTimeoutMs: options.heartbeatTimeoutMs }),
      ...(options.maxReconnectDelayMs === undefined
        ? {}
        : { maxReconnectDelayMs: options.maxReconnectDelayMs }),
      ...(options.reconnectDelayMs === undefined
        ? {}
        : { reconnectDelayMs: options.reconnectDelayMs }),
      ...(options.webSocketConstructor === undefined
        ? {}
        : { webSocketConstructor: options.webSocketConstructor }),
    };
    this.metadataClient = new RestClient({
      ...(options.assetCacheTtlMs === undefined
        ? {}
        : { assetCacheTtlMs: options.assetCacheTtlMs }),
      ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
      ...(options.testnet === undefined ? {} : { testnet: options.testnet }),
      ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
    });
  }

  connect(): Promise<void> {
    return this.getConnection('public').connection.connect();
  }

  async subscribe<S extends WebsocketSubscription>(
    subscription: S,
    callback: WebsocketCallback<S>,
  ): Promise<WebsocketSubscriptionHandle<S>> {
    const normalized = await this.normalizeSubscription(subscription);
    const connectionKey = this.connectionKey(normalized);
    const context = this.getConnection(connectionKey);
    const id = subscriptionId(normalized);
    const existing = context.subscriptions.get(id);

    try {
      if (existing) {
        existing.callbacks.add(callback as UntypedCallback);
        if (!context.connection.isOpen) {
          await context.connection.connect();
        }
      } else {
        context.subscriptions.set(id, {
          callbacks: new Set([callback as UntypedCallback]),
          subscription: normalized,
        });
        if (context.connection.isOpen) {
          context.connection.sendNow({
            method: 'subscribe',
            subscription: normalized,
          });
        } else {
          await context.connection.connect();
        }
      }
    } catch (error) {
      const entry = context.subscriptions.get(id);
      entry?.callbacks.delete(callback as UntypedCallback);
      if (entry?.callbacks.size === 0) {
        context.subscriptions.delete(id);
      }
      throw error;
    }

    return {
      subscription: normalized,
      unsubscribe: () => this.unsubscribe(normalized, callback),
    };
  }

  async unsubscribe<S extends WebsocketSubscription>(
    subscription: S,
    callback?: WebsocketCallback<S>,
  ): Promise<void> {
    const normalized = await this.normalizeSubscription(subscription);
    const connectionKey = this.connectionKey(normalized);
    const context = this.connections.get(connectionKey);
    if (!context) {
      return;
    }

    const id = subscriptionId(normalized);
    const entry = context.subscriptions.get(id);
    if (!entry) {
      return;
    }

    if (callback) {
      entry.callbacks.delete(callback as UntypedCallback);
    } else {
      entry.callbacks.clear();
    }
    if (entry.callbacks.size > 0) {
      return;
    }

    context.subscriptions.delete(id);
    if (context.connection.isOpen) {
      context.connection.sendNow({
        method: 'unsubscribe',
        subscription: normalized,
      });
    }
  }

  on(event: WebsocketLifecycleEvent, callback: LifecycleCallback): () => void {
    const listeners = this.lifecycleListeners.get(event) ?? new Set();
    listeners.add(callback);
    this.lifecycleListeners.set(event, listeners);
    return () => listeners.delete(callback);
  }

  close(): void {
    for (const context of this.connections.values()) {
      context.connection.close();
    }
    this.connections.clear();
  }

  resolveAsset(identifier: number | string): Promise<ResolvedAsset> {
    return this.metadataClient.resolveAsset(identifier);
  }

  refreshAssetMetadata(): Promise<void> {
    return this.metadataClient.refreshAssetMetadata();
  }

  private getConnection(connectionKey: string): ConnectionContext {
    const existing = this.connections.get(connectionKey);
    if (existing) {
      return existing;
    }

    const context: ConnectionContext = {
      connection: new WsConnection(this.wsUrl, this.connectionOptions),
      connectionKey,
      subscriptions: new Map(),
    };
    context.connection.on('open', () => {
      this.resubscribe(context);
      this.emit('open', { connectionKey });
    });
    context.connection.on('reconnect', () => {
      this.resubscribe(context);
      this.emit('reconnect', { connectionKey });
    });
    context.connection.on('close', (event) => {
      this.emit('close', { connectionKey, event });
    });
    context.connection.on('error', (event) => {
      this.emit('error', { connectionKey, event });
    });
    context.connection.on('message', (message) => {
      this.handleMessage(context, message);
    });
    this.connections.set(connectionKey, context);
    return context;
  }

  private resubscribe(context: ConnectionContext): void {
    for (const entry of context.subscriptions.values()) {
      context.connection.sendNow({
        method: 'subscribe',
        subscription: entry.subscription,
      });
    }
  }

  private handleMessage(context: ConnectionContext, value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(value);
    } catch {
      return;
    }
    const record = recordValue(message);
    if (!record || typeof record.channel !== 'string') {
      return;
    }
    if (
      record.channel === 'pong' ||
      record.channel === 'subscriptionResponse'
    ) {
      return;
    }
    if (record.channel === 'error') {
      this.emit('error', {
        connectionKey: context.connectionKey,
        event: record.data,
      });
      return;
    }

    for (const entry of context.subscriptions.values()) {
      if (
        !channelMatches(entry.subscription, record.channel) ||
        !eventMatches(entry.subscription, record.data)
      ) {
        continue;
      }

      let data: unknown;
      try {
        data =
          entry.subscription.type === 'fastAssetCtxs'
            ? decompressFastAssetCtxs(record.data)
            : record.data;
      } catch (error) {
        this.emit('error', {
          connectionKey: context.connectionKey,
          event: error,
        });
        continue;
      }
      for (const callback of entry.callbacks) {
        try {
          callback(data);
        } catch (error) {
          this.emit('error', {
            connectionKey: context.connectionKey,
            event: error,
          });
        }
      }
    }
  }

  private connectionKey(subscription: WebsocketSubscription): string {
    return 'user' in subscription &&
      USER_UNSCOPED_CHANNELS.has(subscription.type)
      ? `user:${subscription.user.toLowerCase()}`
      : 'public';
  }

  private async normalizeSubscription<S extends WebsocketSubscription>(
    subscription: S,
  ): Promise<S> {
    const normalized = normalizeSubscriptionFields(subscription);
    if ('coin' in normalized && normalized.coin.includes('/')) {
      normalized.coin = (
        await this.metadataClient.resolveAsset(normalized.coin)
      ).canonicalName;
    }
    return normalized;
  }

  private emit(
    event: WebsocketLifecycleEvent,
    context: WebsocketLifecycleContext,
  ): void {
    for (const callback of this.lifecycleListeners.get(event) ?? []) {
      try {
        callback(context);
      } catch {
        // Listener errors must not stop other listeners.
      }
    }
  }
}

export type {
  WebsocketCallback,
  WebsocketEventFor,
  WebsocketSubscription,
  WebsocketSubscriptionHandle,
};
