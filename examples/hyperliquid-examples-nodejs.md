# **Hyperliquid API Examples** - Node.js, JavaScript & TypeScript SDK for Hyperliquid REST APIs & WebSockets

This page collects short, copy-ready examples for `@siebly/hyperliquid-api`, the Node.js, JavaScript and TypeScript SDK for the Hyperliquid Info API, Exchange API, WebSocket subscriptions and WebSocket POST API. Each snippet is a complete file. Runnable versions live in [examples/Rest](./Rest/) and [examples/Websocket](./Websocket/).

- [Hyperliquid API documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api) - official Hyperliquid API docs
- [SDK docs](https://sieblyio.github.io/docs/hyperliquid/) - guides and the full API reference
- [JavaScript tutorial](https://siebly.io/sdk/hyperliquid/javascript/tutorial) - a longer walkthrough

## Installation

```bash
npm install @siebly/hyperliquid-api
```

The SDK works with `import` and `require`, and ships its own TypeScript types.

## Create a client

### Public client (no key)

Info calls such as mids, order books, candles and metadata do not need a key.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

// Testnet:
// const client = new RestClient({ testnet: true });
```

### Private client (private key)

Exchange actions are signed locally with your private key. Nothing is sent to Hyperliquid except the signature.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
  // testnet: true,
});
```

### API wallet (agent wallet) client

If the key belongs to an API wallet approved for your account, pass the master account (or sub-account) address as `accountAddress`. Info reads and signed actions then target that account.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!, // API wallet key
  accountAddress: process.env.HYPERLIQUID_ACCOUNT_ADDRESS!, // master account
});
```

### Trade on behalf of a vault

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
  vaultAddress: process.env.HYPERLIQUID_VAULT_ADDRESS!,
});
```

## Info API (market data)

### Get mid prices for all coins

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const mids = await client.getAllMids();
console.log('BTC mid:', mids.BTC);
console.log('ETH mid:', mids.ETH);
```

### Get the L2 order book

`levels[0]` holds bids and `levels[1]` holds asks. `nSigFigs` is optional aggregation.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const book = await client.getOrderBook({ coin: 'BTC', nSigFigs: 5 });
console.log('best bid:', book?.levels[0]?.[0]);
console.log('best ask:', book?.levels[1]?.[0]);
```

### Get candles (OHLCV)

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const candles = await client.getCandles({
  coin: 'ETH',
  interval: '1h',
  startTime: Date.now() - 24 * 60 * 60_000,
});
console.log('candles:', candles.length, candles.at(-1));
```

### Get recent trades

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const trades = await client.getRecentTrades({ coin: 'BTC' });
console.log(trades);
```

### Get perp and spot metadata

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const [perpMeta, spotMeta] = await Promise.all([
  client.getPerpMetadata(),
  client.getSpotMetadata(),
]);
console.log('perps:', perpMeta.universe.map((row) => row.name).slice(0, 10));
console.log('spot pairs:', spotMeta.universe.length);
```

### Resolve a symbol to an asset id and size decimals

Spot pairs such as `HYPE/USDC` map to `@<index>` coins on the Info API. `resolveAsset()` and `nameToCoin()` do the lookup for you.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const asset = await client.resolveAsset('HYPE/USDC');
console.log(asset.assetId, asset.canonicalName, asset.kind, asset.szDecimals);

const coin = await client.nameToCoin('HYPE/USDC');
console.log('Info API coin name:', coin);
```

### Get funding rate history and predicted funding

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const history = await client.getFundingHistory({
  coin: 'ETH',
  startTime: Date.now() - 24 * 60 * 60_000,
});
console.log('last funding:', history.at(-1));

const predicted = await client.getPredictedFundingRates();
console.log('predicted funding entries:', predicted.length);
```

### Get exchange status

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

console.log(await client.getExchangeStatus());
```

## Info API (account data)

Account reads use the client's account address by default. Pass `user` to read any public address.

### Get spot and perp balances in one call

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const balances = await client.getBalances();
console.log('spot balances:', balances.spot.balances);
console.log('perp withdrawable:', balances.perp.withdrawable);
console.log('perp positions:', balances.perp.assetPositions);
```

### Get positions and margin summary for any address

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const summary = await client.getPerpAccountSummary({
  user: '0x4529cB8C5A97D33ceD674970218DCC2312ef689C',
});
for (const entry of summary.assetPositions) {
  console.log(entry.position.coin, entry.position.szi, entry.position.leverage);
}
```

### Get open orders, fills and order status

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const openOrders = await client.getOpenOrders();
console.log('open orders:', openOrders);

const fills = await client.getUserFillsByTime({
  startTime: Date.now() - 7 * 24 * 60 * 60_000,
});
console.log('fills this week:', fills.length);

// Look up by numeric order id or by client order id (cloid)
const status = await client.getOrderStatus({
  oid: '0x00000000000000000000000000000001',
});
console.log(status);
```

### Get funding payments and ledger updates

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const funding = await client.getUserFundingHistory({
  startTime: Date.now() - 7 * 24 * 60 * 60_000,
});
console.log('funding payments:', funding.length);

const ledger = await client.getUserNonFundingLedgerUpdates({
  startTime: Date.now() - 30 * 24 * 60 * 60_000,
});
console.log('deposits, withdrawals and transfers:', ledger.length);
```

### Check your request rate limit

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

console.log(await client.getUserRateLimit());
```

## Exchange API (trading)

Order helpers take a symbol (`'ETH'`, `'PURR/USDC'`), a side and string prices and sizes. Hyperliquid has a minimum order value of $10.

### Place a limit order (GTC) with a client order id

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const result = await client.submitLimitOrder({
  symbol: 'ETH',
  side: 'buy',
  price: '1100',
  size: '0.01',
  clientOrderId: '0x00000000000000000000000000000001',
  // timeInForce: 'IOC',
  // postOnly: true, // ALO
  // reduceOnly: true,
});

if (result.status === 'ok') {
  const status = result.response.data?.statuses[0];
  if (status && 'resting' in status) {
    console.log('resting oid:', status.resting.oid);
  } else {
    console.log('status:', status);
  }
}
```

### Place a market order and close a position

`submitMarketOrder()` sends an aggressive IOC limit with slippage protection. `submitMarketClose()` reads your position, picks the side and sends a reduce-only IOC. Omit `size` to close the full position.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const opened = await client.submitMarketOrder(
  { symbol: 'BTC', side: 'buy', size: '0.00015' },
  { expiresAfter: Date.now() + 10_000 }, // reject if not processed in 10s
);
console.log(JSON.stringify(opened, null, 2));

const closed = await client.submitMarketClose({ symbol: 'BTC' });
console.log(JSON.stringify(closed, null, 2));
```

### Place a spot order

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const spot = await client.submitLimitOrder({
  symbol: 'PURR/USDC',
  side: 'buy',
  price: '0.01',
  size: '1100',
});
console.log(JSON.stringify(spot, null, 2));
```

### Place an entry with take profit and stop loss (normalTpsl)

`submitOrder()` takes Hyperliquid order wires. `a` accepts a symbol or numeric asset id.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const grouped = await client.submitOrder({
  grouping: 'normalTpsl',
  orders: [
    { a: 'ETH', b: true, p: '1100', r: false, s: '0.01', t: { limit: { tif: 'Gtc' } } },
    {
      a: 'ETH', b: false, p: '1300', r: true, s: '0.01',
      t: { trigger: { isMarket: true, tpsl: 'tp', triggerPx: '1300' } },
    },
    {
      a: 'ETH', b: false, p: '900', r: true, s: '0.01',
      t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx: '1000' } },
    },
  ],
});
console.log(JSON.stringify(grouped, null, 2));
```

### Place a trailing stop

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const asset = await client.resolveAsset('ETH');
const trailing = await client.submitTrailingStop({
  asset: asset.assetId,
  isBuy: false,
  sz: '0.01',
  reduceOnly: true,
  retracement: { pct: '1.5%' }, // or { px: '100' } for a fixed distance
  activationPx: null,
});
console.log(JSON.stringify(trailing, null, 2));
```

### Modify a resting order

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const modified = await client.modifyOrder({
  oid: 123456789, // or a client order id string
  order: { a: 'ETH', b: true, p: '1150', r: false, s: '0.01', t: { limit: { tif: 'Gtc' } } },
});
console.log(modified);
```

### Cancel orders by order id or client order id

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

// By numeric order id
await client.cancelOrders({ cancels: [{ a: 'ETH', o: 123456789 }] });

// By client order id
await client.cancelOrdersByClientOrderId({
  cancels: [{ asset: 'ETH', cloid: '0x00000000000000000000000000000001' }],
});
```

### Cancel every open order

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

const openOrders = await client.getOpenOrders();
if (openOrders.length) {
  const result = await client.cancelOrders({
    cancels: openOrders.map((order) => ({ a: order.coin, o: order.oid })),
  });
  console.log(result);
}
```

### Dead man's switch (schedule cancel)

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

// Cancel all open orders if no new schedule arrives within 60 seconds
await client.setCancelAllAfter({ time: Date.now() + 60_000 });
```

### Set leverage and isolated margin

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

await client.updateLeverage({ asset: 'ETH', isCross: true, leverage: 5 });
await client.updateLeverage({ asset: 'ETH', isCross: false, leverage: 3 });

// Add 1 USDC of margin to an isolated ETH long
await client.updateIsolatedMargin({ asset: 'ETH', isBuy: true, ntli: 1 });
```

### TWAP order

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

// Buy 0.1 ETH over 30 minutes, not reduce-only, with randomised slices
const twap = await client.submitTwapOrder({ a: 'ETH', b: true, s: '0.1', r: false, m: 30, t: true });
console.log(JSON.stringify(twap, null, 2));
```

## Transfers and API wallets

These are user-signed actions and must be signed by the main wallet key, not an API wallet.

### Approve an API wallet (agent)

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!, // main wallet
});

await client.approveApiWallet({
  agentAddress: '0xYourApiWalletAddress',
  agentName: 'my-bot',
});
```

### Move USDC between spot and perp, send USDC, withdraw

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

await client.transferUsdBetweenSpotAndPerp({ amount: '10', toPerp: true });
await client.sendUsd({ destination: '0xRecipientAddress', amount: '5' });
await client.withdrawUsd({ destination: '0xYourArbitrumAddress', amount: '5' });
```

## WebSockets

### Subscribe to public market data

The client connects on the first `subscribe()`, sends heartbeats, reconnects automatically and resubscribes after a reconnect. On a slow network, raise `connectionTimeout` if the first connection attempt times out.

```typescript
import { WebsocketClient } from '@siebly/hyperliquid-api';

const ws = new WebsocketClient({
  // Optional: allow a slower WebSocket handshake (milliseconds)
  connectionTimeout: 5000,
});

ws.on('message', (event) => {
  if (event.channel === 'allMids') {
    console.log('BTC mid:', event.data.mids.BTC);
  } else if (event.channel === 'l2Book') {
    console.log('book:', event.data.coin, event.data.levels[0]?.[0], event.data.levels[1]?.[0]);
  } else {
    console.log(event.channel, event.data);
  }
});
ws.on('response', (event) => console.log('ack:', event.channel, event.data));
ws.on('reconnected', ({ wsKey }) => console.log('reconnected', wsKey));
ws.on('exception', (event) => console.error('ws error:', event));

await ws.subscribe([
  { type: 'allMids' },
  { type: 'l2Book', coin: 'ETH' },
  { type: 'trades', coin: 'BTC' },
  { type: 'candle', coin: 'ETH', interval: '1m' },
  { type: 'bbo', coin: 'ETH' },
  { type: 'activeAssetCtx', coin: 'BTC' },
]);
```

### Subscribe to account updates (fills, orders)

Account streams are keyed by address and need no private key.

```typescript
import { WebsocketClient } from '@siebly/hyperliquid-api';

const user = process.env.HYPERLIQUID_ADDRESS!;
const ws = new WebsocketClient({ connectionTimeout: 5000 });

ws.on('message', (event) => {
  if (event.channel === 'userFills') {
    console.log('fills:', event.data.isSnapshot, event.data.fills);
  } else if (event.channel === 'orderUpdates') {
    console.log('orders:', event.data);
  }
});

await ws.subscribe([
  { type: 'userFills', user },
  { type: 'orderUpdates', user },
  { type: 'userEvents', user },
  { type: 'clearinghouseState', user },
]);

process.once('SIGINT', () => ws.closeAll());
```

### Unsubscribe

```typescript
import { WebsocketClient } from '@siebly/hyperliquid-api';

const ws = new WebsocketClient({ connectionTimeout: 5000 });

await ws.subscribe({ type: 'trades', coin: 'BTC' });
// later
await ws.unsubscribe({ type: 'trades', coin: 'BTC' });
ws.closeAll();
```

## WebSocket API (POST over WebSocket)

`WebsocketAPIClient` has the same methods as `RestClient`, sent over one persistent WebSocket connection.

```typescript
import { WebsocketAPIClient } from '@siebly/hyperliquid-api';

const wsApi = new WebsocketAPIClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
  connectionTimeout: 5000,
});

const mids = await wsApi.getAllMids();
console.log('BTC mid:', mids.BTC);

const order = await wsApi.submitLimitOrder({
  symbol: 'ETH',
  side: 'buy',
  price: '1100',
  size: '0.01',
});
console.log(JSON.stringify(order, null, 2));

wsApi.close();
```

## Error handling

Rejected requests throw. Order-level rejections come back inside `response.data.statuses` with an `error` string, so check both.

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
});

try {
  const result = await client.submitLimitOrder({
    symbol: 'ETH',
    side: 'buy',
    price: '1100',
    size: '0.001', // below the $10 minimum
  });
  const status = result.status === 'ok' ? result.response.data?.statuses[0] : undefined;
  if (status && 'error' in status) {
    console.error('order rejected:', status.error);
  }
} catch (e) {
  console.error('request failed:', e);
}
```

## More

- Every method: [docs/endpointFunctionList.md](../docs/endpointFunctionList.md)
- Quickstart guide: [docs/HYPERLIQUID_SDK_QUICKSTART_GUIDE.md](../docs/HYPERLIQUID_SDK_QUICKSTART_GUIDE.md)
- Runnable scripts: [examples/Rest](./Rest/) and [examples/Websocket](./Websocket/)
