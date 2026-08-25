import { RestClient } from '../src/index.js';

const client = new RestClient({ testnet: true });
const meta = await client.getPerpMetadata();
const szDecimals = Object.fromEntries(
  meta.universe.map((asset) => [asset.name, asset.szDecimals]),
);
console.log('szDecimals', szDecimals);

const coin = 'OP';
const maxDecimals = 6;
let px = 1.2345678;
let sz = 12.345678;
if (px > 100_000) {
  px = Math.round(px);
} else {
  const decimals = maxDecimals - Number(szDecimals[coin] ?? 0);
  px = Number(Number(px.toPrecision(5)).toFixed(decimals));
}
sz = Number(sz.toFixed(Number(szDecimals[coin] ?? 0)));
console.log('rounded px/sz for', coin, px, sz);
console.log(
  'Prices: 5 significant figures, at most 6 (perp) or 8 (spot) minus szDecimals. Integer px is always allowed.',
);
