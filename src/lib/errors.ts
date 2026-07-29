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

const REDACTED_KEYS = new Set([
  'authorization',
  'privatekey',
  'r',
  's',
  'signature',
]);

export function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      REDACTED_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : redactSensitiveValues(entry),
    ]),
  );
}
