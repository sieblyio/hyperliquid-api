import { WebsocketClient } from '../src/index.js';

const client = new WebsocketClient();

client.on('exception', ({ event }) => {
  console.error('WebSocket error:', event);
});

const book = await client.subscribe(
  {
    type: 'l2Book',
    coin: 'BTC',
    nSigFigs: 5,
    mantissa: 1,
    fast: true,
  },
  (update) => {
    console.log('Best bid:', update.levels[0][0]);
    console.log('Best ask:', update.levels[1][0]);
  },
);

process.once('SIGINT', () => {
  void book.unsubscribe().finally(() => client.close());
});
