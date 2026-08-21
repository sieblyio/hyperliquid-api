export interface HyperliquidApiErrorOptions {
  cause?: unknown;
  code?: string | undefined;
  response?: unknown;
  status?: number | undefined;
}

export class HyperliquidApiError extends Error {
  readonly code: string | undefined;

  readonly response?: unknown;

  readonly status: number | undefined;

  constructor(message: string, options: HyperliquidApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'HyperliquidApiError';
    this.code = options.code;
    this.response = options.response;
    this.status = options.status;
  }
}
