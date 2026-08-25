import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({ privateKey, testnet: true });
const openOrders = await client.getOpenOrders();
for (const openOrder of openOrders) {
  console.log('cancelling', openOrder);
  console.log(
    await client.cancelOrders({
      cancels: [{ a: openOrder.coin, o: openOrder.oid }],
    }),
  );
}
