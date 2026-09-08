import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Take-profit / stop-loss via native wire orders.
 *
 * 1. A standalone reduce-only stop.
 * 2. A grouped entry + TP + SL (`grouping: 'normalTpsl'`).
 *
 * WARNING: this submits real orders. Prices are far from typical ETH mids so
 * the entry should rest. Cancel leftovers if you stop the script.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-tpsl.ts
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-tpsl.ts --is_buy
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-tpsl.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

const isBuy = process.argv.includes('--is_buy');
const sz = '0.01';
const px = isBuy ? '1100' : '9000';
const triggerPx = isBuy ? '1000' : '8500';
const slPx = isBuy ? '900' : '9500';

(async () => {
  try {
    const parent = await client.submitLimitOrder({
      price: px,
      side: isBuy ? 'buy' : 'sell',
      size: sz,
      symbol: 'ETH',
    });
    console.log('parent limit:', JSON.stringify(parent, null, 2));

    const stop = await client.submitOrder({
      orders: [
        {
          a: 'ETH',
          b: !isBuy,
          p: slPx,
          r: true,
          s: sz,
          t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx } },
        },
      ],
    });
    console.log('standalone stop:', JSON.stringify(stop, null, 2));

    const grouped = await client.submitOrder({
      grouping: 'normalTpsl',
      orders: [
        {
          a: 'ETH',
          b: isBuy,
          p: px,
          r: false,
          s: sz,
          t: { limit: { tif: 'Gtc' } },
        },
        {
          a: 'ETH',
          b: !isBuy,
          p: px,
          r: true,
          s: sz,
          t: { trigger: { isMarket: true, tpsl: 'tp', triggerPx: px } },
        },
        {
          a: 'ETH',
          b: !isBuy,
          p: slPx,
          r: true,
          s: sz,
          t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx } },
        },
      ],
    });
    console.log('grouped entry + tp/sl:', JSON.stringify(grouped, null, 2));
  } catch (e) {
    console.error('request failed: ', e);
  }
})();
