export class HyperliquidWebSocketError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = 'HyperliquidWebSocketError';
  }
}
