import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';

import { DEFAULT_REQUEST_TIMEOUT_MS } from '../constants.js';
import type {
  L1RequestOptions,
  MultiSigL1RequestOptions,
  MultiSigUserSignedRequestOptions,
  RawL1RequestOptions,
  RawUserSignedRequestOptions,
  UserSignedRequestOptions,
} from '../types/request/exchange.types.js';
import type { ExchangeResponse } from '../types/response/exchange.types.js';
import type { InfoResponse } from '../types/response/info.types.js';
import type {
  JsonObject,
  RestClientNetworkOptions,
  RestClientOptions,
  UserSignedActionDefinition,
} from '../types/shared.types.js';
import { ActionBuilder } from './action-builder.js';
import { AssetResolver } from './asset-resolver.js';
import { HyperliquidApiError } from './errors.js';
import {
  configureHttpsKeepAlive,
  DEFAULT_REQUEST_HEADERS,
} from './https-agent.js';
import { buildUserSignedAction } from './request-utils.js';
import { sanitizeObjectForWire } from './wire.js';

interface HyperliquidErrorResponse {
  response?: string;
  status: 'err';
}

function isHyperliquidErrorResponse(
  value: unknown,
): value is HyperliquidErrorResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    'status' in value &&
    value.status === 'err'
  );
}

export abstract class BaseRestClient {
  protected readonly actionBuilder: ActionBuilder;

  protected readonly assetResolver: AssetResolver;

  protected readonly axios: AxiosInstance;

  protected constructor(
    readonly baseUrl: string,
    options: RestClientOptions = {},
    networkOptions: RestClientNetworkOptions = {},
  ) {
    const requestConfig: AxiosRequestConfig = {
      ...networkOptions,
      baseURL: baseUrl,
      headers: {
        ...DEFAULT_REQUEST_HEADERS,
        ...networkOptions.headers,
      },
      timeout: networkOptions.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
    };

    if (options.keepAlive !== false) {
      configureHttpsKeepAlive(requestConfig, options.keepAliveMsecs);
    }

    this.axios = axios.create(requestConfig);
    this.assetResolver = new AssetResolver(
      (request) => this.submitRawInfoRequest(request),
      options.assetCacheTtlMs,
    );
    this.actionBuilder = new ActionBuilder(this.assetResolver, options);
  }

  submitRawInfoRequest<T = InfoResponse>(request: object): Promise<T> {
    return this.post<T>('/info', sanitizeObjectForWire({ ...request }));
  }

  async submitRawL1Action<T = ExchangeResponse>(
    action: JsonObject,
    options: RawL1RequestOptions = {},
  ): Promise<T> {
    const envelope = await this.actionBuilder.prepareL1Action(action, options);
    return this.post<T>('/exchange', envelope);
  }

  async submitRawUserSignedAction<T = ExchangeResponse>(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    options: RawUserSignedRequestOptions = {},
  ): Promise<T> {
    const envelope = await this.actionBuilder.prepareUserSignedAction(
      action,
      definition,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  async submitMultiSigL1Action<T = ExchangeResponse>(
    action: JsonObject,
    options: MultiSigL1RequestOptions,
  ): Promise<T> {
    const envelope = await this.actionBuilder.prepareMultiSigL1Action(
      action,
      options.signers,
      options.multiSigUser,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  async submitMultiSigUserSignedAction<T = ExchangeResponse>(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    options: MultiSigUserSignedRequestOptions,
  ): Promise<T> {
    const envelope = await this.actionBuilder.prepareMultiSigUserSignedAction(
      action,
      definition,
      options.signers,
      options.multiSigUser,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  protected info<T>(type: string, params: object): Promise<T> {
    const fields = sanitizeObjectForWire({ ...params });
    delete fields.type;
    return this.submitRawInfoRequest<T>({ type, ...fields });
  }

  protected l1(
    type: string,
    params: object,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    const fields = { ...params } as JsonObject;
    delete fields.type;
    const action = { type, ...fields };
    return this.submitRawL1Action(action, options);
  }

  protected userSigned(
    type: string,
    params: object,
    definition: UserSignedActionDefinition,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.submitRawUserSignedAction(
      buildUserSignedAction(type, params),
      definition,
      options,
    );
  }

  protected async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const response = await this.axios.post<T>(path, body);

      if (isHyperliquidErrorResponse(response.data)) {
        throw new HyperliquidApiError(
          response.data.response || 'Hyperliquid rejected the request.',
          { response: response.data, status: response.status },
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HyperliquidApiError) {
        throw error;
      }

      if (isAxiosError(error)) {
        const response = error.response?.data;
        const responseMessage =
          typeof response === 'string' ? response : undefined;

        throw new HyperliquidApiError(
          responseMessage || error.message || 'Hyperliquid request failed.',
          {
            cause: error,
            code: error.code,
            response,
            status: error.response?.status,
          },
        );
      }

      throw error;
    }
  }
}
