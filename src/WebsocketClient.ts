import { inflateSync, strFromU8 } from 'fflate';

import { MAINNET_WS_URL, TESTNET_WS_URL } from './constants.js';
import type { ResolvedAsset } from './lib/asset-resolver.js';
import { BaseWebsocketClient } from './lib/BaseWSClient.js';
import { HyperliquidApiError } from './lib/errors.js';
import { normalizeAddresses } from './lib/normalize-addresses.js';
import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import {
  DefaultLogger,
  type DefaultLogger as Logger,
} from './lib/websocket/logger.js';
import type { WsConnection } from './lib/websocket/WsConnection.js';
import { sanitizeObjectForWire } from './lib/wire.js';
import { RestClient } from './RestClient.js';
import type { ExchangeResponse } from './types/response/exchange.types.js';
import type { RequestOptions } from './types/shared.types.js';
import type { WebsocketClientOptions } from './types/websockets/ws-general.js';
import type {
  WebsocketCallback,
  WebsocketEventFor,
  WebsocketSubscription,
  WebsocketSubscriptionHandle,
} from './types/websockets/ws-subscriptions.js';

type UntypedCallback = (data: unknown) => void;

interface PendingRequest {
  cleanup: () => void;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
}

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

const COIN_REMAP_SUBSCRIPTIONS = new Set([
  'activeAssetCtx',
  'bbo',
  'candle',
  'l2Book',
  'trades',
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

function postErrorRequestId(message: string): number | undefined {
  const trailingId = /id=(\d+)$/.exec(message);
  if (trailingId) {
    return Number(trailingId[1]);
  }

  const echoedRequest = /{.*}/.exec(message)?.[0];
  if (!echoedRequest) {
    return undefined;
  }

  try {
    const parsed = recordValue(JSON.parse(echoedRequest));
    return typeof parsed?.id === 'number' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

function positiveFinite(
  value: number | undefined,
  fallback: number,
  field: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${field} must be a finite number greater than 0.`);
  }
  return resolved;
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

export class WebsocketClient extends BaseWebsocketClient {
  private nextRequestId = 0;

  private readonly pendingRequests = new Map<number, PendingRequest>();

  private readonly requestTimeoutMs: number;

  private readonly subscriptionContexts = new Map<string, ConnectionContext>();

  private readonly metadataClient: RestClient;

  private readonly wsUrl: string;

  constructor(
    options: WebsocketClientOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super(
      {
        ...(options.autoReconnect === undefined
          ? {}
          : { autoReconnect: options.autoReconnect }),
        ...(options.maxReconnectTimeout === undefined
          ? {}
          : { maxReconnectTimeout: options.maxReconnectTimeout }),
        ...(options.pingInterval === undefined
          ? {}
          : { pingInterval: options.pingInterval }),
        ...(options.pongTimeout === undefined
          ? {}
          : { pongTimeout: options.pongTimeout }),
        ...(options.reconnectTimeout === undefined
          ? {}
          : { reconnectTimeout: options.reconnectTimeout }),
        ...(options.webSocketConstructor === undefined
          ? {}
          : { webSocketConstructor: options.webSocketConstructor }),
      },
      logger,
    );
    this.wsUrl =
      options.wsUrl ??
      (options.testnet === true ? TESTNET_WS_URL : MAINNET_WS_URL);
    this.requestTimeoutMs = positiveFinite(
      options.requestTimeoutMs,
      10_000,
      'requestTimeoutMs',
    );
    this.metadataClient = new RestClient(
      {
        ...(options.assetCacheTtlMs === undefined
          ? {}
          : { assetCacheTtlMs: options.assetCacheTtlMs }),
        ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
        ...(options.testnet === undefined ? {} : { testnet: options.testnet }),
      },
      options.requestOptions,
    );
  }

  connect(wsKey: 'api' | 'public' = 'public'): Promise<void> {
    if (wsKey === 'public') {
      this.getConnection(wsKey);
    }
    return this.connectWebsocket(wsKey);
  }

  sendWSAPIRequest<T>(
    endpoint: 'action' | 'info',
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const id = ++this.nextRequestId;
    const request = {
      id,
      method: 'post',
      request: {
        payload: body,
        type: endpoint,
      },
    };

    return new Promise<T>((resolve, reject) => {
      if (options.signal?.aborted) {
        reject(new HyperliquidWebSocketError('WebSocket request was aborted.'));
        return;
      }

      const timeoutMs = positiveFinite(
        options.timeout,
        this.requestTimeoutMs,
        'timeout',
      );
      const timer = setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (!pending) {
          return;
        }
        this.pendingRequests.delete(id);
        pending.cleanup();
        pending.reject(
          new HyperliquidWebSocketError(
            `WebSocket request timed out after ${timeoutMs} ms.`,
          ),
        );
      }, timeoutMs);
      const abort = () => {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(new HyperliquidWebSocketError('WebSocket request was aborted.'));
      };
      options.signal?.addEventListener?.('abort', abort, { once: true });
      const cleanup = () => {
        clearTimeout(timer);
        options.signal?.removeEventListener?.('abort', abort);
      };

      this.pendingRequests.set(id, {
        cleanup,
        reject,
        resolve: (value) => resolve(value as T),
      });
      void this.getWsConnection('api')
        .send(request)
        .catch((error) => {
          const pending = this.pendingRequests.get(id);
          if (!pending) {
            return;
          }
          this.pendingRequests.delete(id);
          pending.cleanup();
          pending.reject(
            new HyperliquidWebSocketError(
              'Failed to send the Hyperliquid WebSocket request.',
              { cause: error },
            ),
          );
        });
    });
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
    const context = this.subscriptionContexts.get(connectionKey);
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

  resolveAsset(identifier: number | string): Promise<ResolvedAsset> {
    return this.metadataClient.resolveAsset(identifier);
  }

  nameToCoin(name: string): Promise<string> {
    return this.metadataClient.nameToCoin(name);
  }

  refreshAssetMetadata(): Promise<void> {
    return this.metadataClient.refreshAssetMetadata();
  }

  override closeAll(): void {
    this.rejectPendingRequests(
      new HyperliquidWebSocketError(
        'The Hyperliquid WebSocket API client was closed.',
      ),
    );
    super.closeAll();
  }

  private getConnection(connectionKey: string): ConnectionContext {
    const existing = this.subscriptionContexts.get(connectionKey);
    if (existing) {
      return existing;
    }

    const context: ConnectionContext = {
      connection: this.getWsConnection(connectionKey),
      connectionKey,
      subscriptions: new Map(),
    };
    this.subscriptionContexts.set(connectionKey, context);
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

  private handleSubscriptionMessage(
    context: ConnectionContext,
    record: Record<string, unknown>,
  ): void {
    if (typeof record.channel !== 'string') {
      return;
    }
    if (
      record.channel === 'pong' ||
      record.channel === 'subscriptionResponse'
    ) {
      return;
    }
    if (record.channel === 'error') {
      this.emitLifecycle('exception', {
        event: record.data,
        wsKey: context.connectionKey,
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
        this.emitLifecycle('exception', {
          event: error,
          wsKey: context.connectionKey,
        });
        continue;
      }
      for (const callback of entry.callbacks) {
        try {
          callback(data);
        } catch (error) {
          this.emitLifecycle('exception', {
            event: error,
            wsKey: context.connectionKey,
          });
        }
      }
    }
  }

  private handlePostMessage(
    wsKey: string,
    record: Record<string, unknown>,
  ): void {
    if (record.channel === 'error') {
      const message =
        typeof record.data === 'string' ? record.data : 'WebSocket error';
      const requestId = postErrorRequestId(message);
      if (requestId === undefined) {
        this.emitLifecycle('exception', { event: record.data, wsKey });
      } else {
        this.rejectRequest(requestId, new HyperliquidWebSocketError(message));
      }
      return;
    }
    if (record.channel !== 'post') {
      return;
    }

    const data = recordValue(record.data);
    if (!data || typeof data.id !== 'number') {
      return;
    }
    const response = recordValue(data.response);
    if (!response || typeof response.type !== 'string') {
      this.rejectRequest(
        data.id,
        new HyperliquidWebSocketError(
          'Hyperliquid returned a malformed WebSocket POST response.',
        ),
      );
      return;
    }
    if (response.type === 'error') {
      this.rejectRequest(
        data.id,
        new HyperliquidWebSocketError(
          typeof response.payload === 'string'
            ? response.payload
            : 'Hyperliquid rejected the WebSocket request.',
        ),
      );
      return;
    }
    if (response.type === 'info') {
      this.resolveRequest(data.id, recordValue(response.payload)?.data);
      return;
    }
    if (response.type === 'action') {
      const actionResponse = recordValue(response.payload) as
        ExchangeResponse | undefined;
      if (
        actionResponse?.status === 'err' &&
        typeof actionResponse.response === 'string'
      ) {
        this.rejectRequest(
          data.id,
          new HyperliquidApiError(actionResponse.response, {
            response: response.payload,
          }),
        );
      } else {
        this.resolveRequest(data.id, response.payload);
      }
      return;
    }

    this.rejectRequest(
      data.id,
      new HyperliquidWebSocketError(
        `Hyperliquid returned an unknown WebSocket POST response type "${response.type}".`,
      ),
    );
  }

  private resolveRequest(id: number, value: unknown): void {
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(id);
    pending.cleanup();
    pending.resolve(value);
  }

  private rejectRequest(id: number, error: unknown): void {
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(id);
    pending.cleanup();
    pending.reject(error);
  }

  private rejectPendingRequests(error: unknown): void {
    for (const [id, pending] of this.pendingRequests) {
      this.pendingRequests.delete(id);
      pending.cleanup();
      pending.reject(error);
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
    if (
      'coin' in normalized &&
      typeof normalized.coin === 'string' &&
      COIN_REMAP_SUBSCRIPTIONS.has(normalized.type)
    ) {
      normalized.coin = await this.metadataClient.nameToCoin(normalized.coin);
    }
    return normalized;
  }

  protected override getWsUrl(): string {
    return this.wsUrl;
  }

  protected override onConnectionOpen(wsKey: string): void {
    const context = this.subscriptionContexts.get(wsKey);
    if (context) {
      this.resubscribe(context);
    }
  }

  protected override onConnectionReconnected(wsKey: string): void {
    this.onConnectionOpen(wsKey);
  }

  protected override onConnectionClose(wsKey: string, event: unknown): void {
    if (wsKey === 'api') {
      this.rejectPendingRequests(
        new HyperliquidWebSocketError(
          'The Hyperliquid WebSocket connection closed.',
          { cause: event },
        ),
      );
    }
  }

  protected override onConnectionMessage(wsKey: string, value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(value);
    } catch (error) {
      this.emitLifecycle('exception', {
        event: new HyperliquidWebSocketError(
          wsKey === 'api'
            ? 'Hyperliquid returned a non-JSON WebSocket POST message.'
            : 'Hyperliquid returned a non-JSON WebSocket message.',
          { cause: error },
        ),
        wsKey,
      });
      return;
    }
    const record = recordValue(message);
    if (!record) {
      return;
    }
    if (wsKey === 'api') {
      this.handlePostMessage(wsKey, record);
      return;
    }

    const context = this.subscriptionContexts.get(wsKey);
    if (context) {
      this.handleSubscriptionMessage(context, record);
    }
  }

  protected override onConnectionRemoved(wsKey: string): void {
    if (wsKey === 'api') {
      this.rejectPendingRequests(
        new HyperliquidWebSocketError(
          'The Hyperliquid WebSocket API client was closed.',
        ),
      );
    }
    this.subscriptionContexts.delete(wsKey);
  }

  protected override onAllConnectionsRemoved(): void {
    this.subscriptionContexts.clear();
  }
}

export type {
  WebsocketCallback,
  WebsocketEventFor,
  WebsocketSubscription,
  WebsocketSubscriptionHandle,
};
