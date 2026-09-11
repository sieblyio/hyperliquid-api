import { inflateSync, strFromU8 } from 'fflate';

import { MAINNET_WS_URL, TESTNET_WS_URL } from './constants.js';
import type { ResolvedAsset } from './lib/asset-resolver.js';
import {
  BaseWebsocketClient,
  type EmittableEvent,
  type WSOperation,
} from './lib/BaseWSClient.js';
import { HyperliquidApiError } from './lib/errors.js';
import { normalizeAddresses } from './lib/normalize-addresses.js';
import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import {
  DefaultLogger,
  type DefaultLogger as Logger,
} from './lib/websocket/logger.js';
import { sanitizeObjectForWire } from './lib/wire.js';
import { RestClient } from './RestClient.js';
import type { ExchangeResponse } from './types/response/exchange.types.js';
import type { RequestOptions } from './types/shared.types.js';
import type {
  WebsocketMessageEvent,
  WebsocketResponseEvent,
} from './types/websockets/ws-events.js';
import type {
  WebsocketClientOptions,
  WsKey,
} from './types/websockets/ws-general.js';
import type { WebsocketSubscription } from './types/websockets/ws-subscriptions.js';

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

function normalizeSubscriptionFields(
  subscription: WebsocketSubscription,
): WebsocketSubscription {
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
  return normalized as WebsocketSubscription;
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

function decompressFastAssetCtxs(data: unknown): unknown {
  if (typeof data !== 'string') {
    throw new HyperliquidWebSocketError(
      'fastAssetCtxs data must be a base64 string.',
    );
  }
  const compressed = Uint8Array.from(atob(data), (character) =>
    character.charCodeAt(0),
  );
  return JSON.parse(strFromU8(inflateSync(compressed)));
}

export class WebsocketClient extends BaseWebsocketClient<
  WsKey,
  WebsocketSubscription
> {
  private nextRequestId = 0;

  private readonly metadataClient: RestClient;

  private readonly wsUrl: string;

  constructor(
    options: WebsocketClientOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super(options, logger);
    this.wsUrl =
      options.wsUrl ??
      (options.testnet === true ? TESTNET_WS_URL : MAINNET_WS_URL);
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

  connect(wsKey: WsKey = 'public'): Promise<void> {
    return this.connectWebsocket(wsKey);
  }

  /** Connect all cached connection groups, or the public connection if none exist. */
  async connectAll(): Promise<void> {
    const keys = this.getWsStore().getKeys();
    await Promise.all(
      (keys.length ? keys : (['public'] as const)).map((key) =>
        this.connect(key),
      ),
    );
  }

  isConnected(wsKey: WsKey = 'public'): boolean {
    return this.isWsConnected(wsKey);
  }

  close(wsKey?: WsKey): void {
    if (wsKey === undefined) {
      this.closeAll();
    } else {
      this.closeWebsocket(wsKey);
    }
  }

  /**
   * Subscribe to one or more wire topics. Listen for data with on('message').
   * Topics are cached before connecting and restored automatically after reconnect.
   * The promise confirms local sending; server acknowledgements emit 'response'.
   * Resolve display aliases explicitly with nameToCoin() when needed.
   */
  async subscribe(
    subscriptions: WebsocketSubscription | readonly WebsocketSubscription[],
  ): Promise<void> {
    const grouped = this.groupSubscriptions(subscriptions);
    await Promise.all(
      [...grouped].map(([wsKey, topics]) =>
        this.subscribeTopicsForWsKey(topics, wsKey),
      ),
    );
  }

  /** Remove cached topics independently of event listeners, including while disconnected. */
  async unsubscribe(
    subscriptions: WebsocketSubscription | readonly WebsocketSubscription[],
  ): Promise<void> {
    const grouped = this.groupSubscriptions(subscriptions);
    await Promise.all(
      [...grouped].map(([wsKey, topics]) =>
        this.unsubscribeTopicsForWsKey(topics, wsKey),
      ),
    );
  }

  async sendWSAPIRequest<T>(
    endpoint: 'action' | 'info',
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const id = ++this.nextRequestId;
    return this.sendRequest<T>(
      'api',
      String(id),
      {
        id,
        method: 'post',
        request: { payload: body, type: endpoint },
      },
      options,
    );
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

  private groupSubscriptions(
    subscriptions: WebsocketSubscription | readonly WebsocketSubscription[],
  ): Map<WsKey, WebsocketSubscription[]> {
    const grouped = new Map<WsKey, WebsocketSubscription[]>();
    const topics: readonly WebsocketSubscription[] = Array.isArray(
      subscriptions,
    )
      ? subscriptions
      : [subscriptions as WebsocketSubscription];
    for (const topic of topics) {
      const normalized = normalizeSubscriptionFields(topic);
      const wsKey: WsKey =
        'user' in normalized && USER_UNSCOPED_CHANNELS.has(normalized.type)
          ? `user:${normalized.user.toLowerCase()}`
          : 'public';
      const requests = grouped.get(wsKey) ?? [];
      requests.push(normalized);
      grouped.set(wsKey, requests);
    }
    return grouped;
  }

  protected override getWsUrl(): string {
    return this.wsUrl;
  }

  protected override getMaxConnections(): number {
    return 10;
  }

  protected override getWsRequestEvents(
    _wsKey: WsKey,
    operation: WSOperation,
    topics: WebsocketSubscription[],
  ): object[] {
    return topics.map((subscription) => ({ method: operation, subscription }));
  }

  protected override sendPingEvent(wsKey: WsKey): boolean {
    this.tryWsSend(wsKey, JSON.stringify({ method: 'ping' }));
    return true;
  }

  protected override resolveEmittableEvents(
    wsKey: WsKey,
    message: string,
  ): EmittableEvent<WsKey>[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch (error) {
      throw new HyperliquidWebSocketError(
        wsKey === 'api'
          ? 'Hyperliquid returned a non-JSON WebSocket POST message.'
          : 'Hyperliquid returned a non-JSON WebSocket message.',
        { cause: error },
      );
    }
    const record = recordValue(parsed);
    if (!record || typeof record.channel !== 'string') {
      return [];
    }
    if (record.channel === 'pong') {
      return [{ eventType: 'pong' }];
    }
    if (record.channel === 'error') {
      const requestId =
        wsKey === 'api' && typeof record.data === 'string'
          ? postErrorRequestId(record.data)
          : undefined;
      if (requestId !== undefined) {
        this.rejectRequest(
          requestId,
          new HyperliquidWebSocketError(String(record.data)),
        );
        return [];
      }
      return [
        {
          eventType: 'exception',
          event: { ...record, channel: 'error', data: record.data, wsKey },
        },
      ];
    }
    if (record.channel === 'subscriptionResponse') {
      return [
        {
          eventType: 'response',
          event: { ...record, wsKey } as WebsocketResponseEvent,
        },
      ];
    }
    if (wsKey === 'api') {
      if (record.channel === 'post') {
        this.handlePostMessage(record);
        return [
          {
            eventType: 'response',
            event: { ...record, wsKey } as WebsocketResponseEvent,
          },
        ];
      }
      return [];
    }

    // Emit each wire message once. Subscription ownership never controls listeners.
    // Keep upstream channel names (including user and activeSpotAssetCtx) unchanged.
    return [
      {
        eventType: 'message',
        event: {
          ...record,
          data:
            record.channel === 'fastAssetCtxs'
              ? decompressFastAssetCtxs(record.data)
              : record.data,
          wsKey,
        } as WebsocketMessageEvent,
      },
    ];
  }

  private handlePostMessage(record: Record<string, unknown>): void {
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
      this.getWsStore().resolveDeferredPromise(
        'api',
        String(data.id),
        recordValue(response.payload)?.data,
      );
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
        this.getWsStore().resolveDeferredPromise(
          'api',
          String(data.id),
          response.payload,
        );
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

  private rejectRequest(id: number, error: unknown): void {
    this.getWsStore().rejectDeferredPromise('api', String(id), error);
  }
}

export type {
  WebsocketEventFor,
  WebsocketSubscription,
} from './types/websockets/ws-subscriptions.js';
