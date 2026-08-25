import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({ privateKey, testnet: true });
const balances = await client.getSpotBalances();
console.log('spot balances:', balances.balances);

const purr = await client.submitLimitOrder({
  price: '0.5',
  side: 'buy',
  size: '24',
  symbol: 'PURR/USDC',
});
console.log(purr);

if (purr.status === 'ok') {
  const status = purr.response.data?.statuses[0];
  if (status && 'resting' in status) {
    console.log(
      'status:',
      await client.getOrderStatus({ oid: status.resting.oid }),
    );
    console.log(
      await client.cancelOrders({
        cancels: [{ a: 'PURR/USDC', o: status.resting.oid }],
      }),
    );
  }
}

const other = await client.submitLimitOrder({
  price: '12',
  side: 'buy',
  size: '1',
  symbol: '@8',
});
console.log(other);
if (other.status === 'ok') {
  const status = other.response.data?.statuses[0];
  if (status && 'resting' in status) {
    console.log(
      await client.cancelOrders({
        cancels: [{ a: 'KORILA/USDC', o: status.resting.oid }],
      }),
    );
  }
}
