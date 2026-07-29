import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({
  privateKey,
  testnet: true,
});

const balances = await client.getBalances();
console.log('Account:', balances.user);
console.log('Spot balances:', balances.spot.balances);
console.log('Perpetual positions:', balances.perp.assetPositions);

const result = await client.submitLimitOrder(
  {
    price: '50000',
    side: 'buy',
    size: '0.001',
    symbol: 'BTC',
  },
  {
    expiresAfter: Date.now() + 10_000,
  },
);

console.log(result);
