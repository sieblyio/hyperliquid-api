import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';

import { DEFAULT_REQUEST_TIMEOUT_MS } from '../constants.js';
import type { RequestOptions } from '../types/shared.types.js';
import { HyperliquidApiError, redactSensitiveValues } from './errors.js';
import {
  configureHttpsKeepAlive,
  DEFAULT_REQUEST_HEADERS,
} from './https-agent.js';

export interface BaseRestClientOptions {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  parseExceptions?: boolean;
  timeout?: number;
}

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
  protected readonly axios: AxiosInstance;

  protected readonly parseExceptions: boolean;

  protected constructor(
    readonly baseUrl: string,
    options: BaseRestClientOptions = {},
  ) {
    const requestConfig: AxiosRequestConfig = {
      baseURL: baseUrl,
      headers: DEFAULT_REQUEST_HEADERS,
      timeout: options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
    };

    if (options.keepAlive !== false) {
      configureHttpsKeepAlive(requestConfig, options.keepAliveMsecs);
    }

    this.axios = axios.create(requestConfig);
    this.parseExceptions = options.parseExceptions !== false;
  }

  protected async post<T>(
    path: string,
    body: unknown,
    requestOptions?: RequestOptions,
  ): Promise<T> {
    try {
      const response = await this.axios.post<T>(path, body, requestOptions);

      if (this.parseExceptions && isHyperliquidErrorResponse(response.data)) {
        throw new HyperliquidApiError(
          response.data.response || 'Hyperliquid rejected the request.',
          {
            response: redactSensitiveValues(response.data),
            status: response.status,
          },
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HyperliquidApiError) {
        throw error;
      }

      if (isAxiosError(error)) {
        const response = redactSensitiveValues(error.response?.data);
        const responseMessage =
          typeof error.response?.data === 'string'
            ? error.response.data
            : undefined;

        throw new HyperliquidApiError(
          responseMessage || error.message || 'Hyperliquid request failed.',
          {
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
