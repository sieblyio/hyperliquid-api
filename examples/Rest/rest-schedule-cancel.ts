import {
  type ExchangeResponse,
  type OrderResponseData,
  RestClient,
} from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Dead-man's switch: place a resting limit, then schedule cancel-all after 10s.
 * Hyperliquid only enables this after $1M traded volume; the example still
 * places and cancels the limit so the order path is exercised either way.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-schedule-cancel.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-schedule-cancel.ts",
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
    const result = await client.submitLimitOrder({
      price: '1100',
      side: 'buy',
      size: '0.01',
      symbol: 'ETH',
    });
    console.log('limit order:', JSON.stringify(result, null, 2));

    const oid = firstRestingOid(result);
    if (oid !== undefined) {
      console.log('status:', await client.getOrderStatus({ oid }));
    }

    try {
      console.log(
        'schedule cancel-all:',
        await client.setCancelAllAfter({ time: Date.now() + 10_000 }),
      );
    } catch (e) {
      console.log(
        'schedule cancel-all skipped:',
        e instanceof Error ? e.message : e,
      );
    }

    if (oid !== undefined) {
      console.log(
        'cancel resting order:',
        await client.cancelOrders({
          cancels: [{ a: 'ETH', o: oid }],
        }),
      );
    }
  } catch (e) {
    console.error('request failed: ', e);
  }
})();
