import { AssetResolver } from '../../src/lib/asset-resolver.js';

const RESPONSES: Record<string, unknown> = {
  allPerpMetas: [
    {
      universe: [
        { name: 'BTC', szDecimals: 5 },
        { name: 'ETH', szDecimals: 4 },
      ],
    },
    {
      universe: [{ name: 'xyz:COIN', szDecimals: 3 }],
    },
  ],
  perpDexs: [null, { name: 'xyz' }],
  spotMeta: {
    tokens: [
      { index: 0, name: 'USDC', szDecimals: 6 },
      { index: 150, name: 'HYPE', szDecimals: 2 },
    ],
    universe: [{ index: 107, name: '@107', tokens: [150, 0] }],
  },
};

describe('AssetResolver', () => {
  test('resolves native, spot, HIP-3, pair, numeric, and outcome identifiers', async () => {
    const submit = jest.fn(async (request: Record<string, unknown>) => {
      return RESPONSES[String(request.type)];
    });
    const resolver = new AssetResolver(submit);

    await expect(resolver.resolve('BTC')).resolves.toEqual({
      assetId: 0,
      canonicalName: 'BTC',
      kind: 'perp',
      szDecimals: 5,
    });
    await expect(resolver.resolve('@107')).resolves.toEqual({
      assetId: 10_107,
      canonicalName: '@107',
      kind: 'spot',
      szDecimals: 2,
    });
    await expect(resolver.resolve('HYPE/USDC')).resolves.toEqual({
      assetId: 10_107,
      canonicalName: '@107',
      kind: 'spot',
      szDecimals: 2,
    });
    await expect(resolver.resolve('xyz:coin')).resolves.toEqual({
      assetId: 110_000,
      canonicalName: 'xyz:COIN',
      kind: 'hip3',
      szDecimals: 3,
    });
    await expect(resolver.resolve('#10')).resolves.toEqual({
      assetId: 100_000_010,
      canonicalName: '#10',
      kind: 'outcome',
    });
    await expect(resolver.resolve(10_107)).resolves.toEqual({
      assetId: 10_107,
      canonicalName: '10107',
      kind: 'spot',
    });
  });

  test('loads lazily, coalesces callers, caches for five minutes, and refreshes manually', async () => {
    let now = 1_000;
    const submit = jest.fn(async (request: Record<string, unknown>) => {
      await Promise.resolve();
      return RESPONSES[String(request.type)];
    });
    const resolver = new AssetResolver(submit, 300_000, () => now);

    expect(submit).not.toHaveBeenCalled();
    await Promise.all([
      resolver.resolve('BTC'),
      resolver.resolve('ETH'),
      resolver.resolve('@107'),
    ]);
    expect(submit).toHaveBeenCalledTimes(3);

    await resolver.resolve('BTC');
    expect(submit).toHaveBeenCalledTimes(3);

    now += 300_000;
    await Promise.all([resolver.resolve('BTC'), resolver.resolve('ETH')]);
    expect(submit).toHaveBeenCalledTimes(6);

    await resolver.refresh();
    expect(submit).toHaveBeenCalledTimes(9);
  });

  test('does not corrupt a good cache when refresh metadata is invalid', async () => {
    let valid = true;
    const submit = jest.fn(async (request: Record<string, unknown>) => {
      if (!valid && request.type === 'allPerpMetas') {
        return {};
      }
      return RESPONSES[String(request.type)];
    });
    const resolver = new AssetResolver(submit);

    await resolver.resolve('BTC');
    valid = false;
    await expect(resolver.refresh()).rejects.toThrow(
      'Invalid allPerpMetas response.',
    );
    await expect(resolver.resolve(0)).resolves.toMatchObject({ kind: 'perp' });
  });

  test('rejects malformed and unknown identifiers clearly', async () => {
    const resolver = new AssetResolver(async (request) => {
      return RESPONSES[String(request.type)];
    });

    await expect(resolver.resolve(-1)).rejects.toThrow(RangeError);
    await expect(resolver.resolve('UNKNOWN')).rejects.toThrow(
      'Unknown Hyperliquid asset "UNKNOWN"',
    );
  });
});
