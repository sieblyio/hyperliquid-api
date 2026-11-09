import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Place a reduce-only trailing stop for an existing ETH long on testnet.
 * Trailing stops are available for perpetuals only.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='<testnet-private-key>' npx tsx examples/Rest/rest-trailing-stop.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Missing HYPERLIQUID_PRIVATE_KEY.');
}

const client = new RestClient({
  privateKey,
  testnet: true,
});

async function main() {
  try {
    const asset = await client.resolveAsset('ETH');
    const result = await client.submitTrailingStop({
      asset: asset.assetId,
      isBuy: false,
      sz: '0.01',
      reduceOnly: true,
      retracement: { pct: '1.234%' },
      // For a fixed price distance, use retracement: { px: '100' }.
      activationPx: null,
    });
    console.log('trailing stop:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
