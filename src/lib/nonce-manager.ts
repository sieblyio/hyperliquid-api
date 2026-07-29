import type { NonceProvider } from '../types/shared.types.js';

export class MonotonicNonceManager implements NonceProvider {
  private readonly lastNonceBySigner = new Map<string, number>();

  constructor(private readonly timestampProvider: () => number = Date.now) {}

  nextNonce(signerAddress: string): number {
    const normalizedSigner = signerAddress.toLowerCase();
    const timestamp = Math.trunc(this.timestampProvider());
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new RangeError(
        'The nonce timestamp must be a non-negative safe integer.',
      );
    }
    const previous = this.lastNonceBySigner.get(normalizedSigner) ?? 0;
    const nonce = Math.max(timestamp, previous + 1);

    if (!Number.isSafeInteger(nonce) || nonce < 0) {
      throw new RangeError(
        'The nonce provider must return a non-negative safe integer.',
      );
    }

    this.lastNonceBySigner.set(normalizedSigner, nonce);
    return nonce;
  }

  reset(signerAddress?: string): void {
    if (signerAddress) {
      this.lastNonceBySigner.delete(signerAddress.toLowerCase());
      return;
    }

    this.lastNonceBySigner.clear();
  }
}

export const sharedNonceManager = new MonotonicNonceManager();

export async function getNextNonce(
  provider: NonceProvider,
  signerAddress: string,
): Promise<number> {
  const nonce = await provider.nextNonce(signerAddress.toLowerCase());

  if (!Number.isSafeInteger(nonce) || nonce < 0) {
    throw new RangeError(
      'The nonce provider must return a non-negative safe integer.',
    );
  }

  return nonce;
}
