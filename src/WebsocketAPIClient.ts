import { MAINNET_WS_URL, TESTNET_WS_URL } from './constants.js';
import { HyperliquidApiError, redactSensitiveValues } from './lib/errors.js';
import { HyperliquidWebSocketError } from './lib/websocket/errors.js';
import { WsConnection } from './lib/websocket/WsConnection.js';
import { RestClient } from './RestClient.js';
import type { RequestOptions } from './types/shared.types.js';
import type {
  WebsocketAPIClientOptions,
  WebsocketLifecycleContext,
  WebsocketLifecycleEvent,
} from './types/websockets/ws-general.js';

interface PendingRequest {
  cleanup: () => void;
  reject: (error: unknown) => void;
  request: unknown;
  resolve: (value: unknown) => void;
}

type LifecycleCallback = (context: WebsocketLifecycleContext) => void;

function asRecord(value: unknown): Record<string, unknown> | undefined {
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
    const parsed = asRecord(JSON.parse(echoedRequest));
    return typeof parsed?.id === 'number' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

export class WebsocketAPIClient extends RestClient {
  private readonly connection: WsConnection;

  private nextRequestId = 0;

  private readonly pending = new Map<number, PendingRequest>();

  private readonly requestTimeoutMs: number;

  private readonly lifecycleListeners = new Map<
    WebsocketLifecycleEvent,
    Set<LifecycleCallback>
  >();

  constructor(options: WebsocketAPIClientOptions = {}) {
    super(options);
    const wsUrl =
      options.wsUrl ??
      (options.testnet === true ? TESTNET_WS_URL : MAINNET_WS_URL);
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.connection = new WsConnection(wsUrl, {
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
    });
    this.connection.on('message', (message) => this.handleMessage(message));
    this.connection.on('open', () =>
      this.emit('open', { connectionKey: 'api' }),
    );
    this.connection.on('reconnect', () =>
      this.emit('reconnect', { connectionKey: 'api' }),
    );
    this.connection.on('error', (event) =>
      this.emit('error', { connectionKey: 'api', event }),
    );
    this.connection.on('close', (event) => {
      this.rejectPending(
        new HyperliquidWebSocketError(
          'The Hyperliquid WebSocket connection closed.',
          { cause: event },
        ),
      );
      this.emit('close', { connectionKey: 'api', event });
    });
  }

  connect(): Promise<void> {
    return this.connection.connect();
  }

  on(event: WebsocketLifecycleEvent, callback: LifecycleCallback): () => void {
    const listeners = this.lifecycleListeners.get(event) ?? new Set();
    listeners.add(callback);
    this.lifecycleListeners.set(event, listeners);
    return () => listeners.delete(callback);
  }

  close(): void {
    this.rejectPending(
      new HyperliquidWebSocketError(
        'The Hyperliquid WebSocket API client was closed.',
      ),
    );
    this.connection.close();
  }

  protected override post<T>(
    path: string,
    body: unknown,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const endpoint =
      path === '/info' ? 'info' : path === '/exchange' ? 'action' : undefined;
    if (!endpoint) {
      return Promise.reject(
        new HyperliquidWebSocketError(
          `WebSocket POST does not support path "${path}".`,
          { request: body },
        ),
      );
    }

    const id = ++this.nextRequestId;
    const request = {
      method: 'post',
      id,
      request: {
        type: endpoint,
        payload: body,
      },
    };

    return new Promise<T>((resolve, reject) => {
      if (requestOptions.signal?.aborted) {
        reject(
          new HyperliquidWebSocketError('WebSocket request was aborted.', {
            request: redactSensitiveValues(request),
          }),
        );
        return;
      }

      const timeoutMs = requestOptions.timeout ?? this.requestTimeoutMs;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const abort = () => {
        this.pending.delete(id);
        if (timer) {
          clearTimeout(timer);
        }
        reject(
          new HyperliquidWebSocketError('WebSocket request was aborted.', {
            request: redactSensitiveValues(request),
          }),
        );
      };
      requestOptions.signal?.addEventListener?.('abort', abort, { once: true });
      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
        }
        requestOptions.signal?.removeEventListener?.('abort', abort);
      };
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          const pending = this.pending.get(id);
          if (!pending) {
            return;
          }
          this.pending.delete(id);
          pending.cleanup();
          pending.reject(
            new HyperliquidWebSocketError(
              `WebSocket request timed out after ${timeoutMs} ms.`,
              { request: pending.request },
            ),
          );
        }, timeoutMs);
      }

      this.pending.set(id, {
        cleanup,
        reject,
        request: redactSensitiveValues(request),
        resolve: (value) => resolve(value as T),
      });
      void this.connection.send(request).catch((error) => {
        const pending = this.pending.get(id);
        if (!pending) {
          return;
        }
        this.pending.delete(id);
        pending.cleanup();
        pending.reject(
          new HyperliquidWebSocketError(
            'Failed to send the Hyperliquid WebSocket request.',
            { cause: error, request: pending.request },
          ),
        );
      });
    });
  }

  private handleMessage(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(value);
    } catch {
      return;
    }
    const record = asRecord(message);
    if (!record || typeof record.channel !== 'string') {
      return;
    }
    if (record.channel === 'error') {
      const text =
        typeof record.data === 'string' ? record.data : 'WebSocket error';
      const requestId = postErrorRequestId(text);
      if (requestId !== undefined) {
        this.rejectOne(requestId, new HyperliquidWebSocketError(text));
      } else {
        this.emit('error', { connectionKey: 'api', event: record.data });
      }
      return;
    }
    if (record.channel !== 'post') {
      return;
    }

    const data = asRecord(record.data);
    if (!data || typeof data.id !== 'number') {
      return;
    }
    const response = asRecord(data.response);
    if (!response || typeof response.type !== 'string') {
      this.rejectOne(
        data.id,
        new HyperliquidWebSocketError(
          'Hyperliquid returned a malformed WebSocket POST response.',
        ),
      );
      return;
    }
    if (response.type === 'error') {
      this.rejectOne(
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
      const payload = asRecord(response.payload);
      this.resolveOne(data.id, payload?.data);
      return;
    }

    if (response.type === 'action') {
      const payload = response.payload;
      const actionResponse = asRecord(payload);
      if (
        this.parseExceptions &&
        actionResponse?.status === 'err' &&
        typeof actionResponse.response === 'string'
      ) {
        this.rejectOne(
          data.id,
          new HyperliquidApiError(actionResponse.response, {
            response: redactSensitiveValues(actionResponse),
          }),
        );
      } else {
        this.resolveOne(data.id, payload);
      }
      return;
    }

    this.rejectOne(
      data.id,
      new HyperliquidWebSocketError(
        `Hyperliquid returned an unknown WebSocket POST response type "${response.type}".`,
      ),
    );
  }

  private resolveOne(id: number, value: unknown): void {
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    this.pending.delete(id);
    pending.cleanup();
    pending.resolve(value);
  }

  private rejectOne(id: number, error: unknown): void {
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    this.pending.delete(id);
    pending.cleanup();
    pending.reject(error);
  }

  private rejectPending(error: unknown): void {
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      pending.cleanup();
      pending.reject(error);
    }
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
