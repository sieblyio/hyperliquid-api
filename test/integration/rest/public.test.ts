import { RestClient } from '../../../src/index.js';

const describeLive =
  process.env.RUN_LIVE_HYPERLIQUID_TESTS === 'true' ? describe : describe.skip;

describeLive('public REST integration', () => {
  test.each([
    ['mainnet', false],
    ['testnet', true],
  ])('%s Info calls return live metadata', async (_network, testnet) => {
    const client = new RestClient({ testnet });
    const [mids, meta, spotMeta] = await Promise.all([
      client.getAllMids(),
      client.getPerpMetadata(),
      client.getSpotMetadata(),
    ]);

    expect(Object.keys(mids).length).toBeGreaterThan(0);
    expect(meta.universe.length).toBeGreaterThan(0);
    expect(spotMeta.universe.length).toBeGreaterThan(0);
  });
});
