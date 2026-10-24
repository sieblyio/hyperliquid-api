import {
  type DefaultLogger,
  type HyperliquidSigner,
  RestClient,
  WebsocketAPIClient,
  WebsocketClient,
  type WebsocketMessageEvent,
  type WebsocketSubscription,
  type WebSocketConstructor,
} from '../../src/index.js';

declare const signer: HyperliquidSigner;
declare const webSocketConstructor: WebSocketConstructor;
const logger: DefaultLogger = {
  error: () => undefined,
  info: () => undefined,
  trace: () => undefined,
};

const rest = new RestClient(
  {
    accountAddress: '0x1111111111111111111111111111111111111111',
    signer,
    testnet: true,
  },
  { timeout: 5_000 },
);
const subscriptions = new WebsocketClient(
  {
    pingInterval: 10_000,
    testnet: true,
    webSocketConstructor,
  },
  logger,
);
const api = new WebsocketAPIClient(
  {
    privateKey:
      '0x0123456789012345678901234567890123456789012345678901234567890123',
    testnet: true,
    webSocketConstructor,
  },
  logger,
);

void rest.getAllMids();
void rest.getAllMids({ dex: 'xyz' });
void rest.getAccountAddress();
void rest.getBalances();
void rest.getSpotBalances();
void rest.getPerpAccountSummary();
void rest.getPortfolio();
void rest.submitOrder(
  {
    orders: [
      {
        a: 'BTC',
        b: true,
        p: '100000',
        r: false,
        s: '0.001',
        t: { limit: { tif: 'Gtc' } },
      },
    ],
  },
  { expiresAfter: Date.now() + 1_000 },
);
void rest.submitMarketOrder({
  side: 'sell',
  size: '1',
  symbol: 'HYPE/USDC',
});
void rest.submitMarketClose({ symbol: 'ETH' });
void rest.approveBuilderFee();
void rest.approveBuilderFee({ maxFeeRate: '0%' });
void rest.approveBuilderFee({ maxFeeRate: '0.05%', nonce: 1 });
void rest.getOrderBook({ coin: 'HYPE/USDC' });
void rest.nameToCoin('HYPE/USDC');
void rest.submitLimitOrder({
  postOnly: true,
  price: '10',
  side: 'buy',
  size: '1',
  symbol: 'BTC',
});
subscriptions.on('message', (message) => {
  const event: WebsocketMessageEvent = message;
  if (event.channel === 'trades') {
    const latestPrice: string | undefined = event.data[0]?.px;
    void latestPrice;
    // @ts-expect-error A trade message must not expose order book fields.
    void event.data.levels;
  } else if (event.channel === 'l2Book') {
    const time: number = event.data.time;
    void time;
  } else if (event.channel === 'userFills') {
    const snapshot: boolean | undefined = event.data.isSnapshot;
    void snapshot;
  }
});
subscriptions.on('exception', ({ event, wsKey }) => {
  void event;
  void wsKey;
});
const topics: readonly WebsocketSubscription[] = [
  { coin: 'BTC', type: 'trades' },
  {
    coin: 'BTC',
    mantissa: null,
    nSigFigs: null,
    type: 'l2Book',
  },
];
void subscriptions.subscribe(topics);
void subscriptions.unsubscribe(topics);
subscriptions.on('response', (event) => {
  if (event.channel === 'subscriptionResponse') {
    const method: 'subscribe' | 'unsubscribe' = event.data.method;
    void method;
  } else {
    const requestId: number = event.data.id;
    void requestId;
  }
});
subscriptions.removeAllListeners('message');
subscriptions.once('message', () => undefined).off('message', () => undefined);
// @ts-expect-error Subscriptions manage topics; register listeners with on().
void subscriptions.subscribe({ type: 'allMids' }, () => undefined);
// @ts-expect-error The failure event is exception, not EventEmitter's error event.
subscriptions.on('error', () => undefined);
void api.getAllMids();
void api.getBalances();
const apiSocket: WebsocketClient = api.getWSClient();
void apiSocket.sendWSAPIRequest<Record<string, string>>('info', {
  type: 'allMids',
});
void api.submitMarketOrder({
  side: 'buy',
  size: '0.001',
  symbol: 'BTC',
});
void api.submitLimitOrder({
  price: '100000',
  side: 'sell',
  size: '0.001',
  symbol: 'BTC',
  timeInForce: 'IOC',
});
