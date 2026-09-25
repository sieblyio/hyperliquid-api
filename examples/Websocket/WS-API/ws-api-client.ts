import {
  DefaultLogger,
  type ExchangeResponse,
  type OrderResponseData,
  WebsocketAPIClient,
} from '../../../src/index.js';

// or
// import { DefaultLogger, WebsocketAPIClient } from '@siebly/hyperliquid-api';

/**
 * WebsocketAPIClient has the same Info and Exchange methods as RestClient, but
 * sends them over Hyperliquid's correlated WebSocket POST protocol.
 *
 * Public example:
 * npx tsx examples/Websocket/WS-API/ws-api-client.ts
 *
 * Private example:
 * HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Websocket/WS-API/ws-api-client.ts
 */
const logger = {
  ...DefaultLogger,
  // trace: (...params: unknown[]) => console.log(new Date(), 'trace', ...params),
};

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;

const wsClient = new WebsocketAPIClient(
  {
    ...(privateKey === undefined ? {} : { privateKey }),
    // testnet: true,
  },
  logger,
);

wsClient.on('open', (data) => {
  console.log('ws connection opened:', data.wsKey);
});

wsClient.on('reconnecting', ({ wsKey }) => {
  console.log('ws automatically reconnecting.... ', wsKey);
});

wsClient.on('reconnected', (data) => {
  console.log('ws has reconnected ', data?.wsKey);
});

wsClient.on('exception', ({ event, data, wsKey }) => {
  console.error('ws exception:', wsKey, event ?? data);
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

async function main() {
  try {
    // Optional: open the WS API connection early so the first call is not a
    // cold start. connect() happens automatically on the first request.
    // await wsClient.connect();

    const mids = await wsClient.getAllMids();
    console.log('BTC mid:', mids.BTC);

    const book = await wsClient.getOrderBook({ coin: 'ETH' });
    console.log('ETH best bid:', book?.levels[0]?.[0]);

    if (!privateKey) {
      console.log(
        'Set HYPERLIQUID_PRIVATE_KEY to also submit a limit over the WS API.',
      );
      return;
    }

    const result = await wsClient.submitLimitOrder({
      price: '1100',
      side: 'buy',
      size: '0.01',
      symbol: 'ETH',
    });
    console.log('WS API limit order:', JSON.stringify(result, null, 2));

    const oid = firstRestingOid(result);
    if (oid !== undefined) {
      console.log(
        'cancel:',
        await wsClient.cancelOrders({
          cancels: [{ a: 'ETH', o: oid }],
        }),
      );
    }
  } catch (e) {
    console.error('WS API request failed: ', e);
  } finally {
    wsClient.close();
  }
}

main();
