import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({ privateKey, testnet: true });
const result = await client.submitLimitOrder({
  price: '1100',
  side: 'buy',
  size: '0.2',
  symbol: 'ETH',
});
console.log(result);

if (result.status === 'ok') {
  const status = result.response.data?.statuses[0];
  if (status && 'resting' in status) {
    console.log(await client.getOrderStatus({ oid: status.resting.oid }));
  }
}

console.log(await client.setCancelAllAfter({ time: Date.now() + 10_000 }));
