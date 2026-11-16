export interface HyperliquidApiErrorOptions {
  cause?: unknown;
  code?: string | undefined;
  exchangeCode?: number | undefined;
  response?: unknown;
  status?: number | undefined;
}

export class HyperliquidApiError extends Error {
  readonly code: string | undefined;

  /** Numeric error code reported by the Hyperliquid node in "Unexpected error (code=N)" messages. */
  readonly exchangeCode?: number | undefined;

  readonly response?: unknown;

  readonly status: number | undefined;

  constructor(message: string, options: HyperliquidApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'HyperliquidApiError';
    this.code = options.code;
    this.exchangeCode = options.exchangeCode;
    this.response = options.response;
    this.status = options.status;
  }
}
