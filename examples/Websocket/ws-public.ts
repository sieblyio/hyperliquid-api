import { DefaultLogger, WebsocketClient } from '../../src/index.js';

// or
// import { DefaultLogger, WebsocketClient } from '@siebly/hyperliquid-api';

/**
 * Public market-data subscriptions.
 *
 * Listen for data with on('message') and acknowledgements with on('response').
 * Every event includes the connection's wsKey.
 *
 * npx tsx examples/Websocket/ws-public.ts
 */
const logger = {
  ...DefaultLogger,
  // Uncomment to log connection lifecycle events:
  // trace: (...params: unknown[]) => console.log(new Date(), 'trace', ...params),
};

const wsClient = new WebsocketClient(
  {
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

wsClient.on('close', ({ wsKey }) => {
  console.log('ws closed:', wsKey);
});

wsClient.on('response', (event) => {
  console.log('ws response:', event.wsKey, event.channel, event.data);
});

wsClient.on('message', (event) => {
  switch (event.channel) {
    case 'allMids':
      console.log('allMids BTC:', event.data.mids.BTC);
      break;
    case 'l2Book':
      console.log(
        'Order book:',
        event.wsKey,
        event.data.coin,
        event.data.levels,
      );
      break;
    case 'trades':
      console.log('Trades:', event.wsKey, event.data);
      break;
    default:
      console.log('Market update:', event.wsKey, event.channel, event.data);
  }
});

async function main() {
  try {
    await wsClient.subscribe([
      { type: 'allMids' },
      { type: 'l2Book', coin: 'ETH' },
      { type: 'trades', coin: 'BTC' },
      { type: 'candle', coin: 'ETH', interval: '1m' },
      { type: 'bbo', coin: 'ETH' },
      { type: 'activeAssetCtx', coin: 'BTC' },
      // Native Spot universe names pass through without metadata requests.
      { type: 'trades', coin: 'PURR/USDC' },
    ]);

    // For a readable alias, resolve it explicitly before subscribing:
    // const coin = await wsClient.nameToCoin('HYPE/USDC');
    // await wsClient.subscribe({ type: 'trades', coin });
  } catch (error) {
    console.error('subscribe failed:', error);
    wsClient.closeAll();
  }
}

process.once('SIGINT', () => wsClient.closeAll());
void main();
