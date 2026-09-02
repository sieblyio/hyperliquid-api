# Node.js & JavaScript SDK for Hyperliquid REST APIs & WebSockets

[![Build & Test](https://github.com/sieblyio/hyperliquid-api/actions/workflows/e2etest.yml/badge.svg?branch=main)](https://github.com/sieblyio/hyperliquid-api/actions/workflows/e2etest.yml)
[![npm version](https://img.shields.io/npm/v/%40siebly%2Fhyperliquid-api)][1]
[![npm size](https://img.shields.io/bundlephobia/min/%40siebly%2Fhyperliquid-api/latest)][1]
[![npm downloads](https://img.shields.io/npm/dt/%40siebly%2Fhyperliquid-api)][1]
[![last commit](https://img.shields.io/github/last-commit/sieblyio/hyperliquid-api)][1]
[![Telegram](https://img.shields.io/badge/chat-on%20telegram-blue.svg)](https://t.me/nodetraders)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/sieblyio/hyperliquid-api)

<p align="center">
  <a href="https://www.npmjs.com/package/@siebly/hyperliquid-api">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/sieblyio/hyperliquid-api/blob/main/docs/images/logoDarkMode2.svg?raw=true#gh-dark-mode-only">
      <img alt="SDK Logo" src="https://github.com/sieblyio/hyperliquid-api/blob/main/docs/images/logoBrightMode2.svg?raw=true#gh-light-mode-only">
    </picture>
  </a>
</p>

[1]: https://www.npmjs.com/package/@siebly/hyperliquid-api

Professional Node.js, JavaScript & TypeScript SDK for the HyperLiquid REST APIs, WebSocket APIs & WebSocket Events:

- Complete integration with all HyperLiquid REST APIs & WebSockets, including the WebSocket API.
- Actively maintained with a modern, promise-driven interface.
- TypeScript support with thorough type declarations for API requests and responses, including the WebSocket API.
- JavaScript support. TypeScript is not required, but is definitely recommended.
- Thorough automated tests covering requests, signing, WebSockets, types, and package consumers.
- Proxy support via Axios integration.
- Robust WebSocket consumer integration with configurable heartbeats & automatic reconnect then resubscribe workflows.
  - Event-driven messaging.
  - Smart WebSocket persistence.
    - Automatically detect silent WebSocket disconnections through timed heartbeats.
    - Automatically handle authentication.
    - Emit a `reconnected` event when a dropped connection is restored.
- WebSocket API integration, with two promise-driven approaches:
  1. Import `WebsocketAPIClient` and use it like the REST API client. Call typed methods and await their responses.
     - See [examples/websocket-api.ts](./examples/websocket-api.ts).
  2. Use `sendWSAPIRequest(...)` directly when you need raw WebSocket POST access.
     - The method connects requests to responses and returns a promise.
- One `RestClient` for public market data, account information, trading, transfers, staking, vaults, subaccounts, deployer actions, multisig, validators, and borrow/lend.
- MessagePack L1 signing and user-signed EIP-712 actions.
- Private keys and portable `signTypedData` signers.
- CEX-style helpers for market orders, limit orders, market closes, balances, and account summaries.
- Perpetual, spot, HIP-3, and outcome asset resolution using official identifiers and metadata-derived aliases.
- Dual ESM and CommonJS output.
- Browser-safe public REST calls and public WebSocket subscriptions.
- Active community support & collaboration in telegram: [Node.js Algo Traders](https://t.me/nodetraders).

# Table of Contents

## Overview

- [Installation](#installation)
- [Documentation](#documentation)
- [Issues & Discussion](#issues--discussion)
- [Related Projects](#related-projects)

## REST API Examples

- [REST](#rest)
- [Assets](#assets)
- [Custom Signer](#custom-signer)

## WebSocket Integration & Examples

- [WebSockets](#websockets)
- [WebSocket Subscriptions: Consuming Events](#websocket-subscriptions-consuming-events)
- [WebSocket API - Sending Commands via WebSockets](#websocket-api---sending-commands-via-websockets)

## Additional Features

- [Logging](#logging)
  - [Customise Logging](#customise-logging)
  - [Debug HTTP Requests](#debug-http-requests)
- [Raw Methods](#raw-methods)
- [Browser Usage](#browser-usage)
- [Use with LLMs & AI](#use-with-llms--ai)
- [Used By](#used-by)

## Contributing

- [Contributions & Thanks](#contributions--thanks)

---

## Installation

```bash
npm install @siebly/hyperliquid-api
```

Node.js 24 or newer and npm 11 or newer are supported.

## Documentation

- [Hyperliquid API documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Info endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint)
- [Exchange endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
- [Asset IDs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/asset-ids)
- [WebSocket subscriptions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions)
- [WebSocket POST requests](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/post-requests)
- [Builder codes](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes)

Request and response types are exported from the package root. Every documented Info and Exchange operation has a corresponding `RestClient` method. Public lookup methods use `get...` names based on the information they return instead of exposing Hyperliquid's internal request type names. See the [examples](./examples) directory for small implementation examples.

## Issues & Discussion

- Issues? Check the [issues tab](https://github.com/sieblyio/hyperliquid-api/issues).
- Discuss & collaborate with other node devs? Join our [Node.js Algo Traders](https://t.me/nodetraders) engineering community on telegram.
- Follow our announcement channel for real-time updates on [X/Twitter](https://x.com/sieblyio)

<!-- template_related_projects -->

## Related Projects

Check out our JavaScript/TypeScript/Node.js SDKs & Projects:

- Visit our website: [https://Siebly.io](https://siebly.io/)
- Try our REST API & WebSocket SDKs published on npmjs:
  - [Bybit JavaScript SDK: bybit-api](https://www.npmjs.com/package/bybit-api)
  - [Hyperliquid JavaScript SDK: @siebly/hyperliquid-api](https://www.npmjs.com/package/@siebly/hyperliquid-api)
  - [Kraken JavaScript SDK: @siebly/kraken-api](https://www.npmjs.com/package/@siebly/kraken-api)
  - [OKX JavaScript SDK: okx-api](https://www.npmjs.com/package/okx-api)
  - [Binance JavaScript SDK: binance](https://www.npmjs.com/package/binance)
  - [Gate (gate.com) JavaScript SDK: gateio-api](https://www.npmjs.com/package/gateio-api)
  - [Bitget JavaScript SDK: bitget-api](https://www.npmjs.com/package/bitget-api)
  - [Kucoin JavaScript SDK: kucoin-api](https://www.npmjs.com/package/kucoin-api)
  - [Coinbase JavaScript SDK: coinbase-api](https://www.npmjs.com/package/coinbase-api)
  - [HTX JavaScript SDK: @siebly/htx-api](https://www.npmjs.com/package/@siebly/htx-api)
- Try my misc utilities:
  - [OrderBooks Node.js: orderbooks](https://www.npmjs.com/package/orderbooks)
  - [Crypto Exchange Account State Cache: accountstate](https://www.npmjs.com/package/accountstate)
- Check out my examples:
  - [awesome-crypto-examples Node.js](https://github.com/sieblyio/awesome-crypto-examples)
  <!-- template_related_projects_end -->

## REST

Public info methods do not need credentials:

```ts
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

const mids = await client.getAllMids();
const book = await client.getOrderBook({
  coin: 'BTC',
  nSigFigs: 5,
  mantissa: 1,
});
const perpSummary = await client.getPerpAccountSummary({
  user: '0x1234567890123456789012345678901234567890',
});
const spotBalances = await client.getSpotBalances({
  user: '0x1234567890123456789012345678901234567890',
});

if (book) {
  console.log(book.levels[0][0]);
}
```

Use `testnet: true` for the testnet API:

```ts
const client = new RestClient({ testnet: true });
```

Signed methods accept a private key on a trusted backend:

```ts
import { RestClient } from '@siebly/hyperliquid-api';

const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('Set HYPERLIQUID_PRIVATE_KEY before starting.');
}

const client = new RestClient({
  privateKey,
});

const balances = await client.getBalances();
console.log('Account:', balances.user);
console.log('Spot:', balances.spot.balances);
console.log('Perpetuals:', balances.perp.assetPositions);

const result = await client.submitOrder({
  orders: [
    {
      a: 'BTC',
      b: true,
      p: '50000',
      s: '0.001',
      r: false,
      t: { limit: { tif: 'Gtc' } },
    },
  ],
});
```

For ordinary single orders, use the CEX-style convenience methods. They handle much of the complexity of sending orders to Hyperliquid's API.

```ts
const marketOrder = await client.submitMarketOrder({
  symbol: 'USOL/USDC',
  side: 'sell',
  size: '52.682',
  maxSlippage: 0.05,
});

const limitOrder = await client.submitLimitOrder({
  symbol: 'BTC',
  side: 'buy',
  size: '0.001',
  price: '50000',
  timeInForce: 'GTC',
});

const postOnlyOrder = await client.submitLimitOrder({
  symbol: 'BTC',
  side: 'sell',
  size: '0.001',
  price: '100000',
  postOnly: true,
});
```

`submitMarketOrder()` uses Hyperliquid's immediate-or-cancel market order mechanism. It loads the current midpoint, applies the requested maximum slippage, rounds the protection price to Hyperliquid's rules, rounds size down to the asset's supported precision, and submits an IOC order that cannot rest on the book. `maxSlippage` defaults to `0.05`, meaning 5%. Spot size is always the base asset quantity.

Both convenience methods support `clientOrderId` and `reduceOnly`. `submitMarketClose()` looks up the perpetual position, infers buy/sell from the signed size, and submits a reduce-only IOC order. Omit `size` to close the full position. `submitLimitOrder()` defaults to `timeInForce: 'GTC'`; use `'IOC'` for immediate-or-cancel or `postOnly: true` for add-liquidity-only behavior. Use `submitOrder()` when submitting batches, TP/SL orders, or other native wire shapes.

Prices, sizes, amounts, and trigger prices are exact decimal strings. JavaScript numbers are not accepted for decimal fields.

Pass signing controls as the second argument:

```ts
await client.submitOrder(
  {
    orders: [
      {
        a: 'BTC',
        b: true,
        p: '50000',
        s: '0.001',
        r: false,
        t: { limit: { tif: 'Gtc' } },
      },
    ],
  },
  {
    expiresAfter: Date.now() + 10_000,
  },
);
```

Configure Axios once as the second constructor argument:

```ts
const client = new RestClient({ testnet: true }, { timeout: 5_000 });
```

Set `vaultAddress` on the client or per request when signing for a vault or subaccount. The SDK lowercases all EVM addresses before signing.

Account getters such as `getBalances()`, `getSpotBalances()`, `getPerpAccountSummary()`, and `getPortfolio()` can omit `user` on an authenticated client. The SDK uses `vaultAddress` or `accountAddress` when configured. Otherwise it resolves an API wallet to its master account with one `userRole` request and caches the result for that client instance. Call `getAccountAddress()` to inspect the resolved address. Public clients without an account or signer must pass `user`.

## Assets

Trading actions accept official identifiers, numeric asset IDs, and aliases derived from live metadata:

- `BTC`
- `@107`
- `dex:COIN`
- `#10`
- `HYPE/USDC`

The metadata cache loads on first use, lasts five minutes, and coalesces concurrent loads. It does not poll in the background.

```ts
const asset = await client.resolveAsset('HYPE/USDC');
console.log(asset.assetId, asset.canonicalName);

await client.refreshAssetMetadata();
```

Info and WebSocket `coin` fields follow official Python `name_to_coin`: exact metadata lookup, including pair aliases. `getOrderBook`, `getCandles`, `getFundingHistory`, and the `l2Book` / `trades` / `candle` / `bbo` / `activeAssetCtx` subscriptions rewrite `HYPE/USDC` to `@107`. `PURR/USDC` stays `PURR/USDC` because that is the universe name. Other info methods leave `coin` as-is.

```ts
const book = await client.getOrderBook({ coin: 'HYPE/USDC' });
```

Spot, HIP-3, and outcome asset IDs follow Hyperliquid's current offset rules. The SDK does not add `-PERP` or `-SPOT` suffixes.

Balance responses keep Hyperliquid's token names. For example, SOL shown in the portfolio UI is currently returned as `USOL` by the API.

## Custom Signer

You can provide an external signer instead of a private key:

```ts
const client = new RestClient({
  signer: {
    address: walletAddress,
    signTypedData: (domain, types, value) =>
      walletClient.signTypedData({
        account: walletAddress,
        domain,
        types,
        primaryType: Object.keys(types)[0],
        message: value,
      }),
  },
});
```

The signer must expose `signTypedData`. It may also expose `address` or `getAddress()`.

For an API wallet, pass the master account address to avoid an extra `userRole` lookup:

```ts
const apiWalletPrivateKey = process.env.HYPERLIQUID_API_WALLET_KEY;
const masterAddress = process.env.HYPERLIQUID_MASTER_ADDRESS;
if (!apiWalletPrivateKey || !masterAddress) {
  throw new Error('Set the API wallet key and master address before starting.');
}

const client = new RestClient({
  privateKey: apiWalletPrivateKey,
  accountAddress: masterAddress,
});
```

If `accountAddress` is omitted, the first account getter or builder preflight resolves the API wallet's master address from `userRole`. Concurrent requests share the same lookup.

The nonce manager is shared by signer address across client instances. Supply `nonceProvider` when a process needs a different source of monotonic nonces.

## WebSockets

Use `WebsocketClient` to subscribe to streaming updates. Use `WebsocketAPIClient` when you want the same promise-driven Info and Exchange methods as `RestClient`, sent over Hyperliquid's WebSocket POST protocol.

Connections open when first needed. Heartbeats, reconnection, resubscription, request correlation, and connection cleanup are handled by the SDK.

### WebSocket Subscriptions: Consuming Events

`WebsocketClient` opens connections when needed, deduplicates matching subscriptions, sends heartbeats, reconnects, and resubscribes.

```ts
import { WebsocketClient } from '@siebly/hyperliquid-api';

const ws = new WebsocketClient();

ws.on('reconnected', ({ wsKey }) => {
  console.log('Reconnected:', wsKey);
});

const book = await ws.subscribe(
  {
    type: 'l2Book',
    coin: 'BTC',
    nSigFigs: 5,
    mantissa: 1,
    fast: true,
  },
  (update) => {
    console.log(update.levels);
  },
);

const fills = await ws.subscribe(
  {
    type: 'userFills',
    user: '0x1234567890123456789012345678901234567890',
  },
  (update) => {
    console.log(update.fills);
  },
);

await book.unsubscribe();
await fills.unsubscribe();
ws.close();
```

`fastAssetCtxs` payloads are decompressed before the callback runs. User streams whose server events omit the user address are isolated on separate per-user connections.

### WebSocket API - Sending Commands via WebSockets

`WebsocketAPIClient` has the same info and exchange methods as `RestClient`, but sends requests over Hyperliquid's correlated WebSocket POST protocol.

```ts
import { WebsocketAPIClient } from '@siebly/hyperliquid-api';

const client = new WebsocketAPIClient();
const mids = await client.getAllMids();
client.close();
```

Use `client.getWSClient()` to access the underlying `WebsocketClient`, including lifecycle events and raw `sendWSAPIRequest()` calls. Use `WebsocketClient` directly for subscribe and consume workflows.

## Logging

### Customise Logging

Pass a custom logger as the second `WebsocketClient` or `WebsocketAPIClient` constructor argument. The logger must provide `trace`, `info`, and `error` methods. `DefaultLogger` keeps trace output disabled unless you override it.

```ts
import { DefaultLogger, WebsocketClient } from '@siebly/hyperliquid-api';

const customLogger = {
  ...DefaultLogger,
  trace: (...params: unknown[]) => console.debug('trace', ...params),
  info: (...params: unknown[]) => console.info('info', ...params),
  error: (...params: unknown[]) => console.error('error', ...params),
};

const ws = new WebsocketClient({}, customLogger);
```

### Debug HTTP Requests

REST requests are quiet by default. Axios-compatible network options can be passed once as the second `RestClient` constructor argument. One option is to route requests through a local debugging proxy. Avoid logging signed `/exchange` request bodies or private keys.

```ts
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient(
  { testnet: true },
  {
    proxy: {
      host: '127.0.0.1',
      port: 8080,
      protocol: 'http',
    },
  },
);
```

## Raw Methods

Typed methods are preferred. Raw methods keep new Hyperliquid operations usable before the SDK adds a dedicated wrapper:

```ts
const result = await client.submitRawInfoRequest({
  type: 'someNewInfoRequest',
});

await client.submitRawL1Action({
  type: 'someNewL1Action',
  field: 'value',
});
```

User-signed raw actions also need their EIP-712 definition:

```ts
await client.submitRawUserSignedAction(
  {
    type: 'someNewUserSignedAction',
    nonce: 0,
  },
  {
    primaryType: 'HyperliquidTransaction:SomeNewAction',
    payloadTypes: [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
);
```

Raw order actions follow the same approval check as typed orders. A caller-provided builder is removed, and the fixed package builder is included only after its approval has been confirmed. Raw methods do not bypass signing, address normalization, nonce handling, or partner attribution.

## Browser Usage

Modern bundlers can import the normal package entry. Public REST calls and public subscriptions are browser-safe.

```ts
import { RestClient, WebsocketClient } from '@siebly/hyperliquid-api';
```

Never embed a private key in frontend code, browser storage, or a public environment variable. Keep backend keys and unattended trading on a trusted server. Direct browser REST access also depends on Hyperliquid's CORS policy.

## Use with LLMs & AI

The README, examples, and exported TypeScript types can be provided directly to coding assistants as package context. A package-specific `llms.txt` file and endpoint map will be added separately.

---

## Referral & Builder Codes

On the first order, cancellation, or modification from a client instance, the SDK passively attempts to set the `SIEBLY` referral code. It does not query the existing referral first, delay the triggering request, or retry repeatedly. If the account already has a referrer or the request fails, trading continues normally.

Accounts without an existing referrer currently receive a 4% referral fee discount when `SIEBLY` is set. The referral also supports ongoing SDK maintenance. Referral rules are controlled by Hyperliquid; see the [referral terms](https://hyperliquid.gitbook.io/hyperliquid-docs/referrals) before trading.

Orders include the fixed Siebly builder code only after the SDK confirms that the account's main wallet has approved it. If an approval check fails, the order continues without the builder code and the SDK emits a warning. When a main-wallet private key is configured and approval is missing, the SDK attempts approval in the background. API and agent wallets cannot grant builder approval themselves.

Approve the builder once using the main account:

```typescript
import { RestClient } from '@siebly/hyperliquid-api';

const masterClient = new RestClient({
  signer: mainWalletSigner,
});

await masterClient.approveBuilderFee();
```

The approval remains valid until it is changed or revoked, so it should not be called during every bot startup. The configured approval limit is 0.01%. See Hyperliquid's [builder-code documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes) and [exchange endpoint documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint) for the upstream rules.

---

## Used By

[![Repository Users Preview Image](https://dependents.info/sieblyio/hyperliquid-api/image)](https://github.com/sieblyio/hyperliquid-api/network/dependents)

---

<!-- template_contributions -->

### Contributions & Thanks

Have my projects helped you? Share the love, there are many ways you can show your thanks:

- Star & share my projects.
- Are my projects useful? Sponsor me on Github and support my effort to maintain & improve them: https://github.com/sponsors/tiagosiebler
- Have an interesting project? Get in touch & invite me to it.
- Or buy me all the coffee:
  - ETH(ERC20): `0xA3Bda8BecaB4DCdA539Dc16F9C54a592553Be06C` <!-- metamask -->
- Sign up with my referral links:
  - OKX (receive a 20% fee discount!): https://www.okx.com/join/42013004
  - Binance (receive a 20% fee discount!): https://accounts.binance.com/register?ref=OKFFGIJJ
  - HyperLiquid (receive a 4% fee discount!): https://app.hyperliquid.xyz/join/SIEBLY
  - Gate: https://www.gate.io/signup/NODESDKS?ref_type=103

<!-- template_contributions_end -->

### Contributions & Pull Requests

Contributions are encouraged, I will review any incoming pull requests. See the [issues tab](https://github.com/sieblyio/hyperliquid-api/issues) for todo items.

<!-- template_star_history -->

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sieblyio/bybit-api,sieblyio/okx-api,sieblyio/binance,sieblyio/bitget-api,sieblyio/bitmart-api,sieblyio/gateio-api,sieblyio/kucoin-api,sieblyio/coinbase-api,sieblyio/orderbooks,sieblyio/accountstate,sieblyio/awesome-crypto-examples&type=Date)](https://star-history.com/#sieblyio/bybit-api&sieblyio/okx-api&sieblyio/binance&sieblyio/bitget-api&sieblyio/bitmart-api&sieblyio/gateio-api&sieblyio/kucoin-api&sieblyio/coinbase-api&sieblyio/orderbooks&sieblyio/accountstate&sieblyio/awesome-crypto-examples&Date)

<!-- template_star_history_end -->
