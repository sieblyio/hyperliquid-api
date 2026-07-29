# Node.js & JavaScript SDK for Hyperliquid REST APIs & WebSockets

[![npm version](https://img.shields.io/npm/v/%40siebly%2Fhyperliquid-api)][1]
[![npm size](https://img.shields.io/bundlephobia/min/%40siebly%2Fhyperliquid-api/latest)][1]
[![npm downloads](https://img.shields.io/npm/dt/%40siebly%2Fhyperliquid-api)][1]
[![last commit](https://img.shields.io/github/last-commit/sieblyio/hyperliquid-api)][1]
[![Telegram](https://img.shields.io/badge/chat-on%20telegram-blue.svg)](https://t.me/nodetraders)

[1]: https://www.npmjs.com/package/@siebly/hyperliquid-api

A TypeScript SDK for the current Hyperliquid REST and WebSocket APIs.

- One `RestClient` for public info requests and signed exchange actions
- Typed WebSocket subscriptions with reconnect and resubscribe support
- REST-style requests over WebSocket through `WebsocketAPIClient`
- MessagePack L1 signing and user-signed EIP-712 actions
- Private keys and portable `signTypedData` signers
- Perpetuals, spot, HIP-3, outcomes, vaults, subaccounts, staking, deployer actions, multisig, validators, and borrow/lend
- Dual ESM and CommonJS output
- Browser-safe public REST and WebSocket use

## Table of Contents

- [Installation](#installation)
- [Documentation](#documentation)
- [REST](#rest)
- [Assets](#assets)
- [Signing](#signing)
- [WebSocket subscriptions](#websocket-subscriptions)
- [WebSocket POST requests](#websocket-post-requests)
- [Raw methods](#raw-methods)
- [Browser usage](#browser-usage)
- [Used By](#used-by)
- [Contributions & Thanks](#contributions--thanks)

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

Request and response types are exported from the package root. Every documented Info and Exchange operation has a corresponding `RestClient` method. Public lookup methods use `get...` names based on the information they return instead of exposing Hyperliquid's internal request type names. The `examples` directory contains small implementation examples.

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

For ordinary single orders, use the CEX-style convenience methods. They handle much of the complexity of sending orders to Hyperliquid's API

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

Both convenience methods support `clientOrderId` and `reduceOnly`. `submitLimitOrder()` defaults to `timeInForce: 'GTC'`; use `'IOC'` for immediate-or-cancel or `postOnly: true` for add-liquidity-only behavior. Use `submitOrder()` when submitting batches, TP/SL orders, or other native wire shapes.

Prices, sizes, amounts, and trigger prices are exact decimal strings. JavaScript numbers are not accepted for decimal fields.

Pass request controls as the second argument:

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
    requestOptions: { timeout: 5_000 },
  },
);
```

Set `vaultAddress` on the client or per request when signing for a vault or subaccount. The SDK lowercases all EVM addresses before signing.

Account getters such as `getBalances()`, `getSpotBalances()`, `getPerpAccountSummary()`, and `getPortfolio()` can omit `user` on an authenticated client. The SDK uses `vaultAddress` or `accountAddress` when configured. Otherwise it resolves an API wallet to its master account with one `userRole` request and caches the result for that client instance. Call `getAccountAddress()` to inspect the resolved address. Public clients without an account or signer must pass `user`.

## Assets

Asset inputs support official identifiers and aliases derived from live metadata. Trading actions also accept numeric asset IDs:

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

Spot, HIP-3, and outcome asset IDs follow Hyperliquid's current offset rules. The SDK does not add `-PERP` or `-SPOT` suffixes.

Balance responses keep Hyperliquid's token names. For example, SOL shown in the portfolio UI is currently returned as `USOL` by the API.

## Signing

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

## WebSocket subscriptions

`WebsocketClient` opens connections when needed, deduplicates matching subscriptions, sends heartbeats, reconnects, and resubscribes.

```ts
import { WebsocketClient } from '@siebly/hyperliquid-api';

const ws = new WebsocketClient();

ws.on('reconnect', ({ connectionKey }) => {
  console.log('Reconnected:', connectionKey);
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

## WebSocket POST requests

`WebsocketAPIClient` has the same info and exchange methods as `RestClient`, but sends requests over Hyperliquid's correlated WebSocket POST protocol.

```ts
import { WebsocketAPIClient } from '@siebly/hyperliquid-api';

const client = new WebsocketAPIClient();
const mids = await client.getAllMids();
client.close();
```

Signed WebSocket actions use the same action factory, signer, nonce manager, referral behavior, and builder tagging as REST.

## Raw methods

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

## Browser usage

Modern bundlers can import the normal package entry. Public REST calls and public subscriptions are browser-safe.

```ts
import { RestClient, WebsocketClient } from '@siebly/hyperliquid-api';
```

Never embed a private key in frontend code, browser storage, or a public environment variable. Keep backend keys and unattended trading on a trusted server. Direct browser REST access also depends on Hyperliquid's CORS policy.

## Contributions & Thanks

Issues and pull requests are welcome.

- [GitHub issues](https://github.com/sieblyio/hyperliquid-api/issues)
- [Node.js Algo Traders community](https://t.me/nodetraders)
- [Siebly SDKs and projects](https://siebly.io/?ref=gh)
- [Sponsor ongoing maintenance](https://github.com/sponsors/tiagosiebler)

Have my projects helped you? Share the love, there are many ways you can show your thanks. This SDK automatically gives you a 4% discount on fees, if you don't yet have an existing referral set. Using this SDK will automatically set your referral if you don't have one yet. This is essential for the 4% discount on fees and supports our efforts to maintain & improve our SDKs, by giving us a percentage of the fees you pay to the exchange. Do support our maintenance efforts by sponsoring us on GitHub and signing up with our referral links:

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

Please consider approving our HyperLiquid builder address to further support our work. This approval must be signed by your Hyperliquid main wallet, not an API or agent wallet. Create a RestClient using your main-wallet private key or signer, then call `approveBuilderFee()` once. For example:

```typescript
const masterClient = new RestClient({
  signer: mainWalletSigner,
});

await masterClient.approveBuilderFee();
```

The approval remains valid until it is changed or revoked, so it should not be called during every bot startup. This is explicitly required by Hyperliquid’s [builder-code documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes). The action itself is documented under the [exchange endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint).

Referral and builder fee rules are controlled by Hyperliquid. See the [referral terms](https://hyperliquid.gitbook.io/hyperliquid-docs/referrals) and [builder-code rules](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes) before trading.

We're a team of developers doing our best to even the playing field to aspiring quants and algorithmic traders. Your support helps us continue and expand our efforts to help users such as yourself.

## Used By

[![Repository Users Preview Image](https://dependents.info/sieblyio/hyperliquid-api/image)](https://github.com/sieblyio/hyperliquid-api/network/dependents)

<!-- template_star_history -->

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=tiagosiebler/bybit-api,tiagosiebler/okx-api,tiagosiebler/binance,tiagosiebler/bitget-api,tiagosiebler/bitmart-api,tiagosiebler/gateio-api,tiagosiebler/kucoin-api,tiagosiebler/coinbase-api,tiagosiebler/orderbooks,tiagosiebler/accountstate,tiagosiebler/awesome-crypto-examples&type=Date)](https://star-history.com/#tiagosiebler/bybit-api&tiagosiebler/okx-api&tiagosiebler/binance&tiagosiebler/bitget-api&tiagosiebler/bitmart-api&tiagosiebler/gateio-api&tiagosiebler/kucoin-api&tiagosiebler/coinbase-api&tiagosiebler/orderbooks&tiagosiebler/accountstate&tiagosiebler/awesome-crypto-examples&Date)

<!-- template_star_history_end -->
