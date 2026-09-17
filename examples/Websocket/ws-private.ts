import { DefaultLogger, WebsocketClient } from '../../src/index.js';

// or
// import { DefaultLogger, WebsocketClient } from '@siebly/hyperliquid-api';

/**
 * Account streams. These need a wallet address, not a private key. The SDK
 * isolates user streams whose server events omit the user onto per-user
 * connections.
 *
 * Data emits through on('message'), with the original channel and wsKey.
 * Subscription acknowledgements emit through on('response').
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

wsClient.on('exception', ({ event, data, wsKey }) => {
  console.error('ws exception:', wsKey, event ?? data);
});

wsClient.on('response', (event) => {
  console.log('ws response:', event.wsKey, event.channel, event.data);
});

wsClient.on('message', (event) => {
  switch (event.channel) {
    case 'orderUpdates':
      console.log('Orders:', event.wsKey, event.data);
      break;
    case 'userFills':
      console.log(
        'Fills:',
        event.data.user,
        event.data.isSnapshot,
        event.data.fills,
      );
      break;
    default:
      console.log('Account update:', event.wsKey, event.channel, event.data);
  }
});

async function main() {
  if (!user) return;
  try {
    await wsClient.subscribe([
      { type: 'userEvents', user },
      { type: 'userFills', user },
      { type: 'orderUpdates', user },
      { type: 'openOrders', user },
      { type: 'activeAssetData', user, coin: 'BTC' },
      { type: 'clearinghouseState', user },
      { type: 'notification', user },
    ]);
  } catch (error) {
    console.error('subscribe failed:', error);
    wsClient.closeAll();
  }
}

process.once('SIGINT', () => wsClient.closeAll());
void main();
