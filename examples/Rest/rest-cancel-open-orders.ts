import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Cancel every open order on the authenticated account.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-cancel-open-orders.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-cancel-open-orders.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

async function main() {
  try {
    const openOrders = await client.getOpenOrders();
    if (openOrders.length === 0) {
      console.log('no open orders');
      return;
    }

    for (const openOrder of openOrders) {
      console.log(
        'cancelling',
        openOrder.coin,
        openOrder.oid,
        openOrder.limitPx,
      );
      console.log(
        await client.cancelOrders({
          cancels: [{ a: openOrder.coin, o: openOrder.oid }],
        }),
      );
    }
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
