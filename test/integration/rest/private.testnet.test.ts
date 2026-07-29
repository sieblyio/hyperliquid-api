import { RestClient } from '../../../src/index.js';

const privateKey = process.env.HYPERLIQUID_TESTNET_PRIVATE_KEY;
const describePrivate =
  process.env.RUN_LIVE_HYPERLIQUID_PRIVATE_TESTS === 'true' && privateKey
    ? describe
    : describe.skip;

describePrivate('private testnet integration', () => {
  test('signs and submits a harmless noop action', async () => {
    const client = new RestClient({
      privateKey,
      testnet: true,
    });

    await expect(client.invalidateNonce()).resolves.toMatchObject({
      status: 'ok',
    });
  });
});
