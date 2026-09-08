import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Hyperliquid tick/lot rules, for when you send raw submitOrder() wires.
 *
 * submitMarketOrder() already rounds size down and builds the IOC protection
 * price. Use this example when you need the same rules for a manual wire.
 *
 * Prices: 5 significant figures, at most 6 (perp) or 8 (spot) minus szDecimals.
 * Integer prices are always allowed.
 *
 * npx tsx examples/Rest/rest-rounding.ts
 */
const client = new RestClient({ testnet: true });

function roundPrice(
  px: number,
  szDecimals: number,
  maxDecimals: number,
): number {
  if (px > 100_000) {
    return Math.round(px);
  }
  const decimals = maxDecimals - szDecimals;
  return Number(Number(px.toPrecision(5)).toFixed(decimals));
}

(async () => {
  try {
    const meta = await client.getPerpMetadata();
    const szDecimals = Object.fromEntries(
      meta.universe.map((asset) => [asset.name, asset.szDecimals]),
    );
    console.log('sample szDecimals', {
      BTC: szDecimals.BTC,
      ETH: szDecimals.ETH,
      OP: szDecimals.OP,
    });

    const coin = 'OP';
    const maxDecimals = 6;
    const px = roundPrice(
      1.2345678,
      Number(szDecimals[coin] ?? 0),
      maxDecimals,
    );
    const sz = Number((12.345678).toFixed(Number(szDecimals[coin] ?? 0)));
    console.log('rounded px/sz for', coin, px, sz);

    const asset = await client.resolveAsset(coin);
    console.log('resolved asset:', asset);
  } catch (e) {
    console.error('request failed: ', e);
  }
})();
