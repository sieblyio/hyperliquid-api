import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Read ETH leverage, then set cross and isolated leverage.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-leverage.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-leverage.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

async function main() {
  try {
    const summary = await client.getPerpAccountSummary();
    for (const entry of summary.assetPositions) {
      if (entry.position.coin === 'ETH') {
        console.log('ETH leverage:', entry.position.leverage);
      }
    }

    console.log(
      'cross 21x:',
      await client.updateLeverage({
        asset: 'ETH',
        isCross: true,
        leverage: 21,
      }),
    );
    console.log(
      'isolated 21x:',
      await client.updateLeverage({
        asset: 'ETH',
        isCross: false,
        leverage: 21,
      }),
    );
    try {
      console.log(
        'isolated margin top-up:',
        await client.updateIsolatedMargin({
          asset: 'ETH',
          isBuy: true,
          ntli: 1,
        }),
      );
    } catch (e) {
      console.log(
        'isolated margin top-up skipped (needs an ETH position):',
        e instanceof Error ? e.message : e,
      );
    }
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
