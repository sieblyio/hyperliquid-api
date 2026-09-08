import {
  type ExchangeResponse,
  type OrderResponseData,
  RestClient,
} from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Spot limit order on PURR/USDC. Spot size is always the base asset quantity.
 * Hyperliquid requires a minimum order value of 10 USDC.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-spot-order.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-spot-order.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

function firstRestingOid(
  result: ExchangeResponse<OrderResponseData>,
): number | undefined {
  if (result.status !== 'ok') {
    return undefined;
  }
  const status = result.response.data?.statuses[0];
  return status && 'resting' in status ? status.resting.oid : undefined;
}

(async () => {
  try {
    const balances = await client.getSpotBalances();
    console.log('spot balances:', balances.balances);

    const purr = await client.submitLimitOrder({
      price: '0.01',
      side: 'buy',
      size: '1100',
      symbol: 'PURR/USDC',
    });
    console.log('PURR/USDC order:', JSON.stringify(purr, null, 2));

    const oid = firstRestingOid(purr);
    if (oid === undefined) {
      console.log('order did not rest; nothing to cancel');
      return;
    }

    console.log('status:', await client.getOrderStatus({ oid }));
    console.log(
      'cancel:',
      await client.cancelOrders({
        cancels: [{ a: 'PURR/USDC', o: oid }],
      }),
    );

    // Numeric spot IDs also work. @107 is the HYPE/USDC alias on mainnet;
    // testnet IDs differ. Prefer the pair name.
    // const other = await client.submitLimitOrder({
    //   price: '12',
    //   side: 'buy',
    //   size: '1',
    //   symbol: '@8',
    // });
  } catch (e) {
    console.error('request failed: ', e);
  }
})();
