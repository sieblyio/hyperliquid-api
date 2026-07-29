export class HyperliquidWebSocketError extends Error {
  readonly request?: unknown;

  constructor(
    message: string,
    options: { cause?: unknown; request?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'HyperliquidWebSocketError';
    this.request = options.request;
  }
}
