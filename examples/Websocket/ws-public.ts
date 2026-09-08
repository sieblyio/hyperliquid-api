import { DefaultLogger, WebsocketClient } from '../../src/index.js';

// or
// import { DefaultLogger, WebsocketClient } from '@siebly/hyperliquid-api';

/**
 * Public market-data subscriptions.
 *
 * Unlike Bybit/OKX/Binance, there is no wsClient.on('update'). Payloads are
 * delivered only to the subscribe() callback below. on() is lifecycle only:
 * open, reconnecting, reconnected, exception, close.
 *
 * npx tsx examples/Websocket/ws-public.ts
 */
const logger = {
  ...DefaultLogger,
  // Uncomment for a verbose view of heartbeats and reconnects:
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

wsClient.on('exception', ({ event, wsKey }) => {
  console.error('ws exception:', wsKey, event);
});

wsClient.on('close', ({ wsKey }) => {
  console.log('ws closed:', wsKey);
});

async function main() {
  try {
    const handles = [
      await wsClient.subscribe({ type: 'allMids' }, (update) => {
        console.log('allMids BTC:', update.mids.BTC);
      }),
      await wsClient.subscribe({ type: 'l2Book', coin: 'ETH' }, (book) => {
        console.log('ETH bid:', book.levels[0]?.[0]);
      }),
      await wsClient.subscribe({ type: 'trades', coin: 'BTC' }, (trades) => {
        console.log('BTC trade:', trades[0]);
      }),
      await wsClient.subscribe(
        { type: 'candle', coin: 'ETH', interval: '1m' },
        (candle) => {
          console.log('ETH candle:', candle);
        },
      ),
      await wsClient.subscribe({ type: 'bbo', coin: 'ETH' }, (bbo) => {
        console.log('ETH bbo:', bbo);
      }),
      await wsClient.subscribe(
        { type: 'activeAssetCtx', coin: 'BTC' },
        (ctx) => {
          console.log('BTC ctx:', ctx);
        },
      ),
      // Spot pair aliases remap the same way as REST info: HYPE/USDC -> @107.
      await wsClient.subscribe(
        { type: 'trades', coin: 'PURR/USDC' },
        (trades) => {
          console.log('PURR trade:', trades[0]);
        },
      ),
    ];

    process.once('SIGINT', () => {
      void Promise.all(handles.map((handle) => handle.unsubscribe())).finally(
        () => wsClient.close(),
      );
    });
  } catch (e) {
    console.error('subscribe failed: ', e);
    wsClient.close();
  }
}

main();
