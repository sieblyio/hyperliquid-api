import {
  MonotonicNonceManager,
  type NonceProvider,
  RestClient,
} from '../../src/index.js';

const ADDRESS = '0x1111111111111111111111111111111111111111';

describe('MonotonicNonceManager', () => {
  test('allocates unique monotonic nonces for concurrent calls per signer', async () => {
    const manager = new MonotonicNonceManager(() => 1_000);
    const values = await Promise.all(
      Array.from({ length: 100 }, async () => manager.nextNonce(ADDRESS)),
    );

    expect(new Set(values).size).toBe(100);
    expect(values).toEqual(
      Array.from({ length: 100 }, (_entry, index) => 1_000 + index),
    );
  });

  test('isolates signers and normalizes address case', () => {
    const manager = new MonotonicNonceManager(() => 20);

    expect(manager.nextNonce(ADDRESS)).toBe(20);
    expect(manager.nextNonce(ADDRESS.toUpperCase())).toBe(21);
    expect(
      manager.nextNonce('0x2222222222222222222222222222222222222222'),
    ).toBe(20);
  });

  test('accepts an injected async nonce provider', async () => {
    const provider: NonceProvider = {
      nextNonce: jest.fn(async () => 99),
    };
    const client = new RestClient({
      nonceProvider: provider,
      privateKey:
        '0x0123456789012345678901234567890123456789012345678901234567890123',
    });
    jest.spyOn(client.actionBuilder, 'partnerConfiguration').mockReturnValue({
      approvalPercentage: '0.01%',
      builder: {
        b: '0x1111111111111111111111111111111111111111',
        f: 10,
      },
      referralCode: 'SIEBLY',
    });

    const envelope = await client.actionBuilder.prepareL1Action({
      type: 'noop',
    });
    expect(envelope.nonce).toBe(99);
    expect(provider.nextNonce).toHaveBeenCalledWith(
      '0x14791697260e4c9a71f18484c9f997b308e59325',
    );
  });

  test.each([-1, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid nonce %s',
    (value) => {
      const manager = new MonotonicNonceManager(() => value);
      expect(() => manager.nextNonce(ADDRESS)).toThrow(RangeError);
    },
  );
});
