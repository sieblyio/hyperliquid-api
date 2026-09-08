import { DefaultLogger, WebsocketClient } from '../../src/index.js';

// or
// import { DefaultLogger, WebsocketClient } from '@siebly/hyperliquid-api';

/**
 * Account streams. These need a wallet address, not a private key. The SDK
 * isolates user streams whose server events omit the user onto per-user
 * connections.
 *
 * Unlike Bybit/OKX/Binance, there is no wsClient.on('update'). Market and
 * account payloads are delivered only to the subscribe() callback below.
 * on() is lifecycle only: open, reconnecting, reconnected, exception, close.
 *
 * Unix:
 * HYPERLIQUID_ADDRESS='0xabc' npx tsx examples/Websocket/ws-private.ts
 */
const user =
  process.env.HYPERLIQUID_ADDRESS ||
  '0x4529cB8C5A97D33ceD674970218DCC2312ef689C';
if (!user) {
  throw new Error(
    "Missing HYPERLIQUID_ADDRESS. Unix example: HYPERLIQUID_ADDRESS='0xabc' npx tsx examples/Websocket/ws-private.ts",
  );
}

const logger = {
  ...DefaultLogger,
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

async function main() {
  try {
    const handles = [
      await wsClient.subscribe({ type: 'userEvents', user }, (event) => {
        console.log('userEvents', event);
      }),
      await wsClient.subscribe({ type: 'userFills', user }, (fills) => {
        console.log('userFills', fills);
      }),
      await wsClient.subscribe({ type: 'orderUpdates', user }, (orders) => {
        console.log('orderUpdates', orders);
      }),
      await wsClient.subscribe({ type: 'openOrders', user }, (orders) => {
        console.log('openOrders', orders);
      }),
      await wsClient.subscribe(
        { type: 'activeAssetData', user, coin: 'BTC' },
        (data) => {
          console.log('activeAssetData', data);
        },
      ),
      await wsClient.subscribe(
        { type: 'clearinghouseState', user },
        (state) => {
          console.log('clearinghouseState', state);
        },
      ),
      await wsClient.subscribe({ type: 'notification', user }, (note) => {
        console.log('notification', note);
      }),
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
