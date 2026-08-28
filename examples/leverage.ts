import { RestClient } from '../src/index.js';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before running this example.');
}

const client = new RestClient({ privateKey, testnet: true });
const summary = await client.getPerpAccountSummary();
for (const entry of summary.assetPositions) {
  const position = (
    entry as { position?: { coin?: string; leverage?: unknown } }
  ).position;
  if (position?.coin === 'ETH') {
    console.log('ETH leverage:', position.leverage);
  }
}

console.log(
  await client.updateLeverage({ asset: 'ETH', isCross: true, leverage: 21 }),
);
console.log(
  await client.updateLeverage({ asset: 'ETH', isCross: false, leverage: 21 }),
);
console.log(
  await client.updateIsolatedMargin({ asset: 'ETH', isBuy: true, ntli: 1 }),
);
