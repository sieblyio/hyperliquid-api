import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({
  privateKey,
  testnet: false,
});

const balances = await client.getBalances();
console.log('Account:', balances.user);
console.log('Spot balances:', balances.spot.balances);
console.log('Perpetual positions:', balances.perp.assetPositions);

const opened = await client.submitMarketOrder(
  {
    side: 'buy',
    size: '0.005',
    symbol: 'BTC',
  },
  {
    expiresAfter: Date.now() + 10_000,
  },
);
console.log('opened:', opened);

const closed = await client.submitMarketClose({ symbol: 'BTC' });
console.log('closed:', closed);
