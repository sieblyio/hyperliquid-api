import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({ privateKey, testnet: true });
const isBuy = process.argv.includes('--is_buy');
const sz = '0.02';
const px = isBuy ? '3500' : '2500';
const triggerPx = isBuy ? '2600' : '3400';
const slPx = isBuy ? '2500' : '3500';

const parent = await client.submitLimitOrder({
  price: px,
  side: isBuy ? 'buy' : 'sell',
  size: sz,
  symbol: 'ETH',
});
console.log(parent);

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
console.log(stop);

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
console.log(grouped);
