import {
  WebsocketClient,
  type WebsocketSubscription,
  type WebsocketSubscriptionHandle,
} from '../src/index.js';

const client = new WebsocketClient();
const user = process.env.HYPERLIQUID_ADDRESS;

client.on('exception', ({ event }) => {
  console.error('WebSocket error:', event);
});

const handles: WebsocketSubscriptionHandle<WebsocketSubscription>[] = [
  await client.subscribe({ type: 'allMids' }, (update) => {
    console.log('allMids', update);
  }),
  await client.subscribe({ type: 'l2Book', coin: 'ETH' }, (book) => {
    console.log('ETH bid:', book.levels[0][0]);
  }),
  await client.subscribe({ type: 'trades', coin: 'PURR/USDC' }, (trades) => {
    console.log('PURR trade:', trades[0]);
  }),
  await client.subscribe(
    { type: 'candle', coin: 'ETH', interval: '1m' },
    (candle) => {
      console.log('ETH candle:', candle);
    },
  ),
  await client.subscribe({ type: 'bbo', coin: 'ETH' }, (bbo) => {
    console.log('ETH bbo:', bbo);
  }),
  await client.subscribe({ type: 'activeAssetCtx', coin: 'BTC' }, (ctx) => {
    console.log('BTC ctx:', ctx);
  }),
  await client.subscribe({ type: 'activeAssetCtx', coin: '@1' }, (ctx) => {
    console.log('spot ctx:', ctx);
  }),
];

if (user) {
  handles.push(
    await client.subscribe({ type: 'userEvents', user }, (event) => {
      console.log('userEvents', event);
    }),
    await client.subscribe({ type: 'userFills', user }, (fills) => {
      console.log('userFills', fills);
    }),
    await client.subscribe({ type: 'orderUpdates', user }, (orders) => {
      console.log('orderUpdates', orders);
    }),
    await client.subscribe(
      { type: 'activeAssetData', user, coin: 'BTC' },
      (data) => {
        console.log('activeAssetData', data);
      },
    ),
  );
}

process.once('SIGINT', () => {
  void Promise.all(handles.map((handle) => handle.unsubscribe())).finally(() =>
    client.close(),
  );
});
