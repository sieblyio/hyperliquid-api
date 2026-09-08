import {
  type ExchangeResponse,
  type OrderResponseData,
  RestClient,
} from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Place a far-from-market GTC limit, look it up by oid and client order id,
 * then cancel by cloid. Hyperliquid requires a minimum order value of $10.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-limit-order.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-limit-order.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

const cloid = '0x00000000000000000000000000000001';

function firstRestingOid(
  result: ExchangeResponse<OrderResponseData>,
): number | undefined {
  if (result.status !== 'ok') {
    return undefined;
  }
  const status = result.response.data?.statuses[0];
  return status && 'resting' in status ? status.resting.oid : undefined;
}

async function main() {
  try {
    const result = await client.submitLimitOrder({
      clientOrderId: cloid,
      price: '1100',
      side: 'buy',
      size: '0.01',
      symbol: 'ETH',
    });
    console.log('limit order:', JSON.stringify(result, null, 2));

    const oid = firstRestingOid(result);
    if (oid === undefined) {
      console.log('order did not rest; nothing to cancel');
      return;
    }

    console.log('by oid:', await client.getOrderStatus({ oid }));
    console.log(
      'cancel by cloid:',
      await client.cancelOrdersByClientOrderId({
        cancels: [{ asset: 'ETH', cloid }],
      }),
    );
    console.log(
      'by cloid after cancel:',
      await client.getOrderStatus({ oid: cloid }),
    );
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
