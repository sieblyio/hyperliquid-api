import {
  type ExchangeResponse,
  type OrderResponseData,
  RestClient,
} from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * CEX-style market order helpers. submitMarketOrder() loads the midpoint,
 * applies maxSlippage (default 5%), rounds, and sends an IOC order.
 *
 * WARNING: this submits a real order, then tries to close it.
 * Size is just above Hyperliquid's $10 minimum so a small account can run it.
 *
 * Unix:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-market-order.ts
 */
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    "Missing HYPERLIQUID_PRIVATE_KEY. Unix example: HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-market-order.ts",
  );
}

const client = new RestClient({
  privateKey,
  // testnet: true,
});

function describeOrder(result: ExchangeResponse<OrderResponseData>): unknown {
  if (result.status !== 'ok') {
    return result;
  }
  return result.response.data?.statuses;
}

async function main() {
  try {
    const balances = await client.getBalances();
    console.log('account:', balances.user);
    console.log('withdrawable:', balances.perp.withdrawable);

    const opened = await client.submitMarketOrder(
      {
        side: 'buy',
        size: '0.00015',
        symbol: 'BTC',
      },
      {
        // Reject the request if it cannot be sent quickly.
        expiresAfter: Date.now() + 10_000,
      },
    );
    console.log('opened:', JSON.stringify(describeOrder(opened), null, 2));

    // Looks up the BTC perpetual position, infers buy/sell from signed size,
    // and submits a reduce-only IOC. Omit size to close the full position.
    const closed = await client.submitMarketClose({ symbol: 'BTC' });
    console.log('closed:', JSON.stringify(describeOrder(closed), null, 2));
  } catch (e) {
    console.error('request failed: ', e);
  }
}

main();
