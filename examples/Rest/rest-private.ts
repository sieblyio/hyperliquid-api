import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Private Info reads. These attach your account address and do not L1-sign.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-private.ts
 *
 * If the key is an API/agent wallet, also pass the master account:
 * HYPERLIQUID_ACCOUNT_ADDRESS='0x...'
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-private.ts",
  );
}

const client = new RestClient({
  privateKey,
  // Optional: if this is an API/agent wallet, pass the master/sub account:
  // accountAddress: process.env.HYPERLIQUID_ACCOUNT_ADDRESS,
  // testnet: true,
});

async function main() {
  try {
    const address = await client.getAccountAddress();
    console.log('account address:', address);

    const balances = await client.getBalances();
    console.log('spot balances:', balances.spot.balances);
    console.log('perp withdrawable:', balances.perp.withdrawable);
    console.log('perp positions:', balances.perp.assetPositions);

    const [openOrders, fills, fees, referral] = await Promise.all([
      client.getOpenOrders(),
      client.getUserFills(),
      client.getUserFees(),
      client.getReferralInfo(),
    ]);
    console.log('open orders:', openOrders);
    console.log('recent fills:', fills.slice(0, 5));
    console.log('user fees:', fees);
    console.log('referral:', referral);

    // Trading examples live in the other Rest/*.ts files. Those submit real
    // testnet orders. Start there only after this read path works.
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
