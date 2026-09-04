<!-- siebly:metadata
siebly:
  version: 1
  hero:
    headline: Hyperliquid API JavaScript Tutorial for Node.js
    badges:
      - Hyperliquid API
      - Perpetuals
      - Spot
      - Public WebSockets
      - Account Streams
      - WebSocket API
      - Testnet
      - Proxies
    summary: Build Hyperliquid integrations with public market data, account state, perpetual and Spot orders, WebSocket streams, WebSocket API requests, Testnet, proxies, and reconnect recovery.
    codeFilename: first-hyperliquid-api-call.js
    codeStatus: public REST API
    startSectionId: start-building-first-calls
  software:
    description: Node.js and JavaScript SDK for Hyperliquid Info and Exchange REST APIs, public and account WebSocket streams, WebSocket API requests, asset resolution, Testnet, and proxy routing.
    topics:
      - Hyperliquid REST API
      - Perpetuals and Spot
      - Account state
      - API wallets
      - Public and account WebSockets
      - WebSocket API requests
      - Testnet order workflows
      - HTTP and SOCKS proxies
      - Reconnect recovery
  machineCatalog:
    label: Hyperliquid API JavaScript Tutorial
    topics:
      - Info response shapes
      - account state by address
      - API wallet signing
      - perpetual and Spot orders
      - public WebSocket streams
      - account WebSocket streams
      - WebSocket API requests
      - asset resolution
      - Testnet
      - proxies
      - reconnect recovery
  sdkPagePromo:
    descriptionBeforePackage: 'A practical JavaScript guide to using '
    descriptionAfterPackage: ' for Hyperliquid market data, account state, perpetual and Spot orders, WebSocket streams, WebSocket API requests, Testnet, proxies, and recovery.'
    highlights:
      - Perpetual and Spot REST API calls
      - Public and account WebSocket streams
      - Testnet order workflows
      - REST API and WebSocket proxy examples
    exampleHref: /examples/Hyperliquid
    exampleLabel: Hyperliquid SDK examples
    architectureClientSummary: RestClient, WebsocketClient, WebsocketAPIClient
    architectureApiTitle: Hyperliquid APIs
    architectureApiSummary: Info requests, signed Exchange actions, streaming subscriptions, and WebSocket POST requests
  surfaceMap:
    heading: Choose the Hyperliquid client for the job
    summary: Use one client for REST API calls, one for subscriptions, and one for awaitable requests over WebSocket.
    appLabel: Bot, dashboard, worker, tool
    appSummary: Any Node.js or JavaScript service that needs Hyperliquid market data, account state, orders, or reconciliation.
    apiLabel: Hyperliquid APIs
    apiItems:
      - Info REST API requests
      - Signed Exchange REST API actions
      - Public and account WebSocket subscriptions
      - Info and Exchange requests over WebSocket
    packageNodes:
      - label: RestClient
        summary: Market data, account state, orders, transfers, staking, vaults, subaccounts, HIP-3, and other Info and Exchange operations
      - label: WebsocketClient
        summary: Public market data and address-scoped account subscriptions
      - label: WebsocketAPIClient
        summary: Awaitable Info and signed Exchange requests over the WebSocket POST protocol
  routing:
    id: hyperliquid-request-routing
    eyebrow: Request routing
    heading: Network, asset, account, signer, and transport are separate choices
    summary: Keep each choice explicit so reads and signed actions reach the intended market and account.
    rows:
      - eyebrow: Network
        code: "testnet: true"
        summary: Select Hyperliquid Testnet instead of Mainnet.
      - eyebrow: Asset
        code: "symbol: 'BTC'"
        summary: Select a perpetual, Spot pair, HIP-3 market, outcome, or numeric asset ID.
      - eyebrow: Account
        code: "accountAddress"
        summary: Identify the master account, subaccount, or vault whose state and orders are being managed.
      - eyebrow: Signer
        code: "privateKey"
        summary: Sign Exchange actions with the main wallet or an approved API wallet.
      - eyebrow: Transport
        code: RestClient or WebsocketAPIClient
        summary: Send awaitable Info and Exchange requests over HTTPS or WebSocket.
  coverage:
    heading: What to get right in a Hyperliquid integration
    summary: Start with public data, then add account state, signing, orders, streams, network configuration, and recovery.
    cards:
      - heading: Assets and account state
        summary: Resolve current market metadata and query the intended account address.
      - heading: Orders and signatures
        summary: Use an approved API wallet, valid decimal strings, and explicit response checks.
      - heading: Streaming updates
        summary: Subscribe to market and account channels, then account for snapshots and reconnects.
      - heading: Networks and recovery
        summary: Keep Mainnet and Testnet configuration separate and rebuild state after a connection gap.
  snippets:
    heading: First REST API calls, streams, orders, recovery, and proxies
    summary: Run one focused JavaScript example at a time, then apply the same clients to the rest of the Hyperliquid API.
    labels:
      public-rest: Public REST API
      account-rest: Account state REST API
      asset-resolution: Asset resolution
      public-websocket: Public WebSocket
      account-websocket: Account WebSocket
      perp-order: Perpetual Testnet order
      spot-order: Spot Testnet order
      websocket-api: WebSocket API
      reconnect-recovery: Reconnect recovery
      api-host-routing: API host routing
      http-proxy: HTTP or HTTPS proxy
      socks-proxy: SOCKS5 proxy
  workflows:
    heading: REST API, subscription, and signed-action workflows
    summary: Info responses, stream snapshots, Exchange responses, and final order state carry different information.
    diagrams:
      - heading: REST API request flow
        summary: Choose an Info method and read the endpoint-specific response directly.
        steps:
          - label: Choose network and method
            owner: app
          - label: Call RestClient
            owner: app
          - label: Resolve asset or account
            owner: sdk
          - label: Receive Info response
            owner: exchange
          - label: Read endpoint fields
            owner: app
      - heading: WebSocket subscription flow
        summary: Subscribe with an object, receive the initial snapshot where provided, then process updates.
        steps:
          - label: Choose subscription
            owner: app
          - label: Call subscribe
            owner: app
          - label: Connect and register
            owner: sdk
          - label: Receive snapshot or update
            owner: event
          - label: Update local state
            owner: app
      - heading: Signed order flow
        summary: Resolve the asset, sign the action, inspect its status, then confirm final state.
        steps:
          - label: Read market and account state
            owner: app
          - label: Build valid decimal values
            owner: app
          - label: Sign and submit action
            owner: sdk
          - label: Inspect each order status
            owner: exchange
          - label: Query or stream final state
            owner: app
  production:
    heading: Before a Hyperliquid integration trades unattended
    summary: Signer isolation, asset rules, response handling, stream continuity, and network routing must all be predictable.
    items:
      - Keep private keys server-side and use a separate approved API wallet for each trading process or subaccount.
      - Query account state with the master account, subaccount, or vault address, not the API wallet address.
      - Read current metadata and use exact decimal strings for prices, sizes, amounts, and trigger prices.
      - Generate client order IDs and query by them before retrying uncertain writes.
      - Inspect every status entry in an Exchange response and confirm final order state separately.
      - Reload balances, positions, open orders, and fills after an account-stream gap.
      - Keep system time synchronized and respect current IP, address, and WebSocket limits.
      - Monitor proxy reachability, latency, and egress IP when a proxy is enabled.
  journeys:
    eyebrow: Choose your path
    heading: Jump to the Hyperliquid workflow you are building
    actionLabel: Open section
    cards:
      - heading: Start with REST API calls
        summary: Read market data, metadata, and account state.
        href: "#start-building-first-calls"
      - heading: Stream live data
        summary: Subscribe to public market data and address-scoped account updates.
        href: "#websocket-streams"
      - heading: Place Testnet orders
        summary: Run complete perpetual and Spot order workflows with an API wallet.
        href: "#order-management"
      - heading: Configure networking
        summary: Select Mainnet or Testnet and configure a proxy when required.
        href: "#api-hosts"
  article:
    heading: Build around Hyperliquid assets and account state
    summary: "This tutorial covers the Hyperliquid API pieces developers usually need first: market data, account state, perpetual and Spot orders, public and account streams, WebSocket API requests, Testnet, proxies, and reconnect recovery."
  related:
    cards:
      - heading: Hyperliquid SDK page
        summary: Return to installation, examples, package links, and SDK information.
        href: /sdk/hyperliquid/javascript
      - heading: Hyperliquid examples
        summary: Browse focused REST API, order, and WebSocket examples.
        href: /examples/Hyperliquid
      - heading: Official API documentation
        summary: Review current Info, Exchange, signing, WebSocket, and rate-limit rules.
        href: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
      - heading: Source repository
        summary: Browse source, releases, issues, and examples on GitHub.
        href: https://github.com/sieblyio/hyperliquid-api
-->

# Hyperliquid API JavaScript Tutorial for Node.js

<!-- siebly:website-omit:start -->

> [!TIP]
> Read this guide in tutorial format on the Siebly website: [Hyperliquid JavaScript REST API and WebSocket Tutorial](https://siebly.io/sdk/hyperliquid/javascript/tutorial)

<!-- siebly:website-omit:end -->

This tutorial uses [`@siebly/hyperliquid-api`](https://www.npmjs.com/package/@siebly/hyperliquid-api), Siebly's Node.js and JavaScript SDK for Hyperliquid. It covers public market data, account state, perpetual and Spot orders, public and account WebSocket streams, WebSocket API requests, Testnet, network routing, and proxies.

The SDK handles asset resolution, action signing, exact wire formatting, nonce allocation, WebSocket heartbeats, reconnects, resubscriptions, and WebSocket request matching. TypeScript declarations are included for projects that use them.

**Key links**

- Hyperliquid JavaScript SDK by Siebly: [`@siebly/hyperliquid-api`](https://siebly.io/sdk/hyperliquid/javascript)
- npm package: [`@siebly/hyperliquid-api`](https://www.npmjs.com/package/@siebly/hyperliquid-api)
- GitHub repository: [`sieblyio/hyperliquid-api`](https://github.com/sieblyio/hyperliquid-api)
- SDK examples: [Hyperliquid SDK examples](https://siebly.io/examples/Hyperliquid)
- Repository examples: [JavaScript and TypeScript examples](../examples)
- Hyperliquid API documentation: [Official API docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- Trading-system terms: [Siebly glossary](https://siebly.io/reference/glossary)
- More JavaScript and TypeScript SDKs: [Siebly.io](https://siebly.io)

## Why use `@siebly/hyperliquid-api`?

Hyperliquid uses one Info endpoint for market and account reads, one Exchange endpoint for signed actions, and one WebSocket endpoint for both subscriptions and request-response traffic. Asset identifiers and signing formats also vary by operation.

`@siebly/hyperliquid-api` presents those surfaces through three clients:

| Client | Use it for |
| --- | --- |
| `RestClient` | Market data, account state, orders, transfers, staking, vaults, subaccounts, and other REST API operations |
| `WebsocketClient` | Public market-data and address-scoped account subscriptions |
| `WebsocketAPIClient` | The same awaitable Info and signed Exchange methods over Hyperliquid's WebSocket POST protocol |

`RestClient` also provides higher-level helpers such as `submitMarketOrder()`, `submitLimitOrder()`, `submitMarketClose()`, and `getBalances()`. Lower-level methods remain available for batching, TP/SL orders, transfers, vault operations, and other advanced workflows.

## Install the SDK

```bash
npm install @siebly/hyperliquid-api
```

Node.js 24 or newer is supported. Every example below is plain JavaScript.

## Set up a wallet and API wallet

Public market data and account-state reads do not require a private key. Hyperliquid account state is queried by public address.

Orders and other Exchange actions require a signer. For an automated process, create and approve an API wallet from the [Hyperliquid API page](https://app.hyperliquid.xyz/API). Hyperliquid also calls these agent wallets.

Keep two values separate:

- The API wallet private key signs actions.
- The master account, subaccount, or vault address identifies the account being managed.

Store them in a server-side environment or secret manager:

- `HYPERLIQUID_API_WALLET_KEY`
- `HYPERLIQUID_ACCOUNT_ADDRESS`

For Testnet examples, use separate values:

- `HYPERLIQUID_TESTNET_API_WALLET_KEY`
- `HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS`

An API wallet address is not the account address. Passing the API wallet address to account queries usually returns empty state. See Hyperliquid's [nonces and API wallets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets) documentation for the full model.

Use one API wallet per trading process. If several processes or subaccounts share a signer, they also share its nonce set. Separate API wallets avoid nonce collisions and make process ownership clearer.

Never put a private key in browser code, logs, or committed configuration.

## Hyperliquid products and request vocabulary

| Field or value | Example | Meaning |
| --- | --- | --- |
| Perpetual symbol | `BTC` | A perpetual market from `getPerpMetadata()` |
| Spot pair | `HYPE/USDC` | A readable Spot alias resolved from current metadata |
| Native Spot name | `PURR/USDC` or `@107` | The name used by HyperCore for a Spot pair |
| HIP-3 symbol | `dex:COIN` | A market on a HIP-3 perpetual DEX |
| Outcome asset | `#10` | An outcome-market identifier |
| `szDecimals` | `5` | The allowed number of decimal places in order size |
| `side` | `buy` or `sell` | The side accepted by the SDK's order helpers |
| `clientOrderId` | `0x` plus 32 hex characters | Your [custom order ID](https://siebly.io/reference/glossary#custom-order-id), called `cloid` by Hyperliquid |
| `accountAddress` | `HYPERLIQUID_ACCOUNT_ADDRESS` | The master account, subaccount, or vault whose state is queried |
| `vaultAddress` | `HYPERLIQUID_VAULT_ADDRESS` | Optional routing for actions signed on behalf of a vault or subaccount |
| `wsKey` | `public`, `api`, or a user-scoped key | The [WebSocket key](https://siebly.io/reference/glossary#ws-key) included with lifecycle events |

Perpetual sizes are quantities of the underlying asset. Spot sizes are quantities of the base asset. Prices, sizes, transfer amounts, and trigger prices are exact decimal strings in SDK requests.

Hyperliquid prices may use up to five significant figures, subject to the asset's decimal limit. Order sizes use the asset's `szDecimals`. Read the current [tick and lot-size rules](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/tick-and-lot-size) before constructing values yourself.

Info responses are endpoint-specific. Some methods return objects, some return arrays, and `getOrderBook()` may return `null` for an unavailable book. There is no shared success envelope for Info responses.

<!-- siebly:section id="start-building-first-calls" -->

## Start building: first REST API calls

Run each example on its own. Start with public market data, then read account state and inspect asset metadata.

### 1. Make public REST API calls

Public Info calls need no wallet or API key.

<!-- siebly:snippet id="public-rest" -->

```javascript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

async function main() {
  try {
    const status = await client.getExchangeStatus();
    console.log('Exchange status:', status);
  } catch (error) {
    console.error('Exchange-status request failed:', error);
  }

  try {
    const mids = await client.getAllMids();
    console.log('BTC midpoint:', mids.BTC);
  } catch (error) {
    console.error('Midpoint request failed:', error);
  }

  try {
    const metadata = await client.getPerpMetadata();
    const btc = metadata.universe.find((asset) => asset.name === 'BTC');
    console.log('BTC perpetual metadata:', btc);
  } catch (error) {
    console.error('Perpetual metadata request failed:', error);
  }

  try {
    const orderBook = await client.getOrderBook({
      coin: 'BTC',
    });
    console.log('Best bid:', orderBook?.levels[0][0]);
    console.log('Best ask:', orderBook?.levels[1][0]);
  } catch (error) {
    console.error('Order-book request failed:', error);
  }

  try {
    const candles = await client.getCandles({
      coin: 'BTC',
      interval: '1h',
      startTime: Date.now() - 24 * 60 * 60 * 1000,
    });
    console.log('Latest hourly candle:', candles.at(-1));
  } catch (error) {
    console.error('Candle request failed:', error);
  }

  try {
    const trades = await client.getRecentTrades({
      coin: 'BTC',
    });
    console.log('Most recent trade:', trades[0]);
  } catch (error) {
    console.error('Recent-trade request failed:', error);
  }
}

main();
```

The response shapes reflect the requested data:

- `getExchangeStatus()` returns an object with `time` and `specialStatuses`.
- `getAllMids()` returns an object whose keys are asset names and whose values are decimal strings.
- `getPerpMetadata()` returns an object with `universe`, `marginTables`, and `collateralToken`.
- `getOrderBook()` returns `coin`, `time`, and two arrays under `levels`. Index `0` contains bids and index `1` contains asks. Each level has `px`, `sz`, and `n`.
- `getCandles()` returns candle objects with fields such as `t`, `T`, `o`, `c`, `h`, `l`, `v`, and `n`.
- `getRecentTrades()` returns an array. `side: 'B'` is a buy and `side: 'A'` is a sell.

### 2. Read account state by address

Balances, positions, orders, and fills are Info queries keyed by a public address. No signer is needed for these reads.

<!-- siebly:snippet id="account-rest" -->

```javascript
import { RestClient } from '@siebly/hyperliquid-api';

const accountAddress = process.env.HYPERLIQUID_ACCOUNT_ADDRESS;

if (!accountAddress) {
  throw new Error('Set HYPERLIQUID_ACCOUNT_ADDRESS before starting.');
}

const client = new RestClient({ accountAddress });

async function main() {
  try {
    const balances = await client.getBalances();
    console.log('Account:', balances.user);
    console.log('Spot balances:', balances.spot.balances);
    console.log('Perpetual positions:', balances.perp.assetPositions);
  } catch (error) {
    console.error('Balance request failed:', error);
  }

  try {
    const openOrders = await client.getOpenOrders();
    console.log('Open orders:', openOrders);
  } catch (error) {
    console.error('Open-order request failed:', error);
  }

  try {
    const fills = await client.getUserFills({
      aggregateByTime: true,
    });
    console.log('Recent fills:', fills);
  } catch (error) {
    console.error('Fill request failed:', error);
  }

  try {
    const funding = await client.getUserFundingHistory({
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    });
    console.log('Recent funding payments:', funding);
  } catch (error) {
    console.error('Funding-history request failed:', error);
  }
}

main();
```

`getBalances()` combines the Spot clearinghouse state and the default perpetual clearinghouse state. The perpetual response includes margin summaries, `withdrawable`, and `assetPositions`. A signed position size is available as `position.szi`: positive is long, negative is short, and zero is flat. Under unified account or portfolio margin, Spot state is the relevant balance view. This helper does not aggregate every HIP-3 DEX.

A client configured with `accountAddress` may omit `user` from account getters. A public client can instead pass `{ user: accountAddress }` to each account method.

Time-ranged Info methods have response limits. Paginate long histories by moving `startTime` to the last returned timestamp. See the official [Info endpoint documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint) for each method's current limit.

### 3. Resolve perpetual, Spot, HIP-3, and outcome assets

The SDK loads current Mainnet or Testnet metadata when an operation needs an asset ID. The cache lasts five minutes by default.

<!-- siebly:snippet id="asset-resolution" -->

```javascript
import { RestClient } from '@siebly/hyperliquid-api';

const client = new RestClient();

async function main() {
  try {
    const btcPerpetual = await client.resolveAsset('BTC');
    console.log('BTC perpetual:', btcPerpetual);
  } catch (error) {
    console.error('Perpetual resolution failed:', error);
  }

  try {
    const hypeSpot = await client.resolveAsset('HYPE/USDC');
    console.log('HYPE/USDC Spot:', hypeSpot);
  } catch (error) {
    console.error('Spot resolution failed:', error);
  }

  try {
    const nativeSpotName = await client.nameToCoin('HYPE/USDC');
    console.log('Native Spot name:', nativeSpotName);
  } catch (error) {
    console.error('Spot-name lookup failed:', error);
  }

  try {
    await client.refreshAssetMetadata();
    console.log('Asset metadata refreshed.');
  } catch (error) {
    console.error('Metadata refresh failed:', error);
  }
}

main();
```

`resolveAsset()` returns the numeric `assetId`, canonical name, asset kind, and `szDecimals` where available. It accepts current metadata names, readable Spot aliases, numeric IDs, HIP-3 names such as `dex:COIN`, and outcome identifiers such as `#10`.

Asset IDs differ across Mainnet and Testnet. Resolve them against the same network that will receive the request. Do not add `-PERP` or `-SPOT` suffixes.

For Info methods and stream subscriptions, the SDK applies Hyperliquid's native name mapping where required. For example, `HYPE/USDC` currently maps to an `@` name, while `PURR/USDC` is already a native universe name. `getOrderBook()`, `getCandles()`, `getFundingHistory()`, and coin-based market subscriptions perform this mapping. `getRecentTrades()` and `getActiveAssetData()` expect an official coin name, so call `nameToCoin()` first when starting with a readable Spot alias.

<!-- siebly:section id="websocket-streams" -->

## Build with Hyperliquid WebSocket streams

`WebsocketClient` manages connections, JSON parsing, heartbeats, reconnects, and resubscriptions. Subscriptions are objects that match Hyperliquid's documented channel types.

### 4. Subscribe to public market data

<!-- siebly:snippet id="public-websocket" -->

```javascript
import { WebsocketClient } from '@siebly/hyperliquid-api';

const client = new WebsocketClient();

async function main() {
  client
    .on('open', ({ wsKey }) => {
      console.log('WebSocket opened:', wsKey);
    })
    .on('reconnecting', ({ wsKey, event }) => {
      console.log('WebSocket reconnecting:', wsKey, event);
    })
    .on('reconnected', ({ wsKey }) => {
      console.log('WebSocket reconnected:', wsKey);
    })
    .on('close', ({ wsKey }) => {
      console.log('WebSocket closed:', wsKey);
    })
    .on('exception', ({ wsKey, event }) => {
      console.error('WebSocket exception:', wsKey, event);
    });

  try {
    await client.subscribe({ type: 'allMids' }, (update) => {
      console.log('BTC midpoint:', update.mids.BTC);
    });
  } catch (error) {
    console.error('Midpoint subscription failed:', error);
  }

  try {
    await client.subscribe({ type: 'l2Book', coin: 'BTC' }, (book) => {
      console.log('Best bid:', book.levels[0][0]);
      console.log('Best ask:', book.levels[1][0]);
    });
  } catch (error) {
    console.error('Order-book subscription failed:', error);
  }

  try {
    await client.subscribe({ type: 'trades', coin: 'BTC' }, (trades) => {
      console.log('Trades:', trades);
    });
  } catch (error) {
    console.error('Trade subscription failed:', error);
  }

  try {
    await client.subscribe(
      { type: 'candle', coin: 'BTC', interval: '1m' },
      (candle) => {
        console.log('One-minute candle:', candle);
      },
    );
  } catch (error) {
    console.error('Candle subscription failed:', error);
  }
}

main();
```

Hyperliquid sends a [subscription acknowledgement](https://siebly.io/reference/glossary#subscription-acknowledgement) when the subscription is registered. The SDK handles that protocol message internally. Your callback receives channel data.

The promise returned by `subscribe()` resolves after the socket opens and the request is sent. It does not wait for the server acknowledgement, so do not use that promise alone as a stream-readiness signal.

Some channels send an initial snapshot before later updates. `l2Book` sends a current book, while `allMids`, trades, and candles continue with new values. The SDK sends heartbeat pings on quiet connections.

Call `client.closeAll()` when the application explicitly needs to close its WebSocket connections.

### 5. Subscribe to account updates

Account subscriptions use the account's public address. They do not need a signer.

<!-- siebly:snippet id="account-websocket" -->

```javascript
import { WebsocketClient } from '@siebly/hyperliquid-api';

const user = process.env.HYPERLIQUID_ACCOUNT_ADDRESS;

if (!user) {
  throw new Error('Set HYPERLIQUID_ACCOUNT_ADDRESS before starting.');
}

const client = new WebsocketClient();

async function main() {
  client
    .on('open', ({ wsKey }) => {
      console.log('WebSocket opened:', wsKey);
    })
    .on('reconnected', ({ wsKey }) => {
      console.log('WebSocket reconnected:', wsKey);
    })
    .on('exception', ({ wsKey, event }) => {
      console.error('WebSocket exception:', wsKey, event);
    });

  try {
    await client.subscribe({ type: 'orderUpdates', user }, (orders) => {
      console.log('Order updates:', orders);
    });
  } catch (error) {
    console.error('Order subscription failed:', error);
  }

  try {
    await client.subscribe(
      { type: 'userFills', user, aggregateByTime: true },
      (update) => {
        console.log('Fill snapshot:', update.isSnapshot === true);
        console.log('Fills:', update.fills);
      },
    );
  } catch (error) {
    console.error('Fill subscription failed:', error);
  }

  try {
    await client.subscribe(
      { type: 'clearinghouseState', user },
      (update) => {
        console.log('Perpetual state:', update.clearinghouseState);
      },
    );
  } catch (error) {
    console.error('Perpetual-state subscription failed:', error);
  }

  try {
    await client.subscribe({ type: 'spotState', user }, (update) => {
      console.log('Spot state:', update.spotState);
    });
  } catch (error) {
    console.error('Spot-state subscription failed:', error);
  }
}

main();
```

`userFills`, `userFundings`, and similar time-series streams tag their initial payload with `isSnapshot: true`. Use the snapshot to initialize state, then process later payloads as changes. Avoid applying the same snapshot twice after a reconnect.

The `orderUpdates` stream reports order transitions. Use it with a REST API query when reconciling [pending confirmation](https://siebly.io/reference/glossary#pending-confirmation) after an uncertain order or cancellation response.

Every lifecycle event includes `wsKey`. Most subscriptions share `public`. User-scoped channels whose server messages omit the address are isolated on a key derived from that address, which prevents updates for different users from being mixed.

<!-- siebly:section id="order-management" -->

## Place and manage Testnet orders

Use Hyperliquid Testnet to run the following workflows. Create and approve an API wallet from the [Testnet API page](https://app.hyperliquid-testnet.xyz/API), fund the account from the [Testnet faucet](https://app.hyperliquid-testnet.xyz/drip), then set `HYPERLIQUID_TESTNET_API_WALLET_KEY` and `HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS`. The faucet currently requires the same address to have deposited on Mainnet.

The SDK signs Exchange actions with the API wallet and sends account queries for the configured account address. It lowercases EVM addresses and formats action fields in the order required by Hyperliquid's signing rules.

Order responses need two checks:

1. `status` must be `ok`.
2. Each entry under `response.data.statuses` must be inspected.

An order status entry may contain `resting`, `filled`, or `error`. A successful request can still contain an order-specific error.

The SDK makes a passive, one-time attempt to apply the `SIEBLY` referral code around the first trading action from a client instance when the account has no existing referrer. It does not replace an existing referrer, delay the order, or retry the referral request. Hyperliquid's current [referral terms](https://hyperliquid.gitbook.io/hyperliquid-docs/referrals) describe any user discount.

### 6. Run a perpetual REST API order lifecycle

This example reads current BTC metadata and book data, places a post-only Testnet order, queries it, cancels it by client order ID, and queries it again.

<!-- siebly:snippet id="perp-order" -->

```javascript
import { randomBytes } from 'node:crypto';
import { RestClient } from '@siebly/hyperliquid-api';

const privateKey = process.env.HYPERLIQUID_TESTNET_API_WALLET_KEY;
const accountAddress = process.env.HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS;

if (!privateKey || !accountAddress) {
  throw new Error(
    'Set HYPERLIQUID_TESTNET_API_WALLET_KEY and HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS before starting.',
  );
}

const client = new RestClient({
  privateKey,
  accountAddress,
  testnet: true,
});

function trimDecimal(value) {
  if (!value.includes('.')) {
    return value;
  }
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

function sizeForNotional(price, szDecimals, targetNotional) {
  const factor = 10 ** szDecimals;
  const size = Math.ceil((targetNotional / Number(price)) * factor) / factor;
  return trimDecimal(size.toFixed(szDecimals));
}

async function main() {
  let btc;
  let orderBook;

  try {
    const metadata = await client.getPerpMetadata();
    btc = metadata.universe.find((asset) => asset.name === 'BTC');
    console.log('BTC metadata:', btc);
  } catch (error) {
    console.error('Perpetual metadata request failed:', error);
    return;
  }

  if (!btc) {
    console.error('BTC was not returned by the Testnet perpetual metadata.');
    return;
  }

  try {
    orderBook = await client.getOrderBook({ coin: 'BTC' });
    console.log('BTC order book received at:', orderBook?.time);
  } catch (error) {
    console.error('Order-book request failed:', error);
    return;
  }

  const bid = orderBook?.levels[0][4] ?? orderBook?.levels[0][0];

  if (!bid) {
    console.error('The BTC order book did not contain a bid.');
    return;
  }

  const clientOrderId = `0x${randomBytes(16).toString('hex')}`;
  const size = sizeForNotional(bid.px, btc.szDecimals, 12);
  let orderId;

  try {
    const result = await client.submitLimitOrder({
      symbol: 'BTC',
      side: 'buy',
      price: bid.px,
      size,
      postOnly: true,
      clientOrderId,
    });
    console.log('Order response:', result);

    if (result.status !== 'ok') {
      console.error('Hyperliquid rejected the order request:', result.response);
      return;
    }

    const orderStatus = result.response.data?.statuses[0];

    if (!orderStatus) {
      console.error('The order response did not contain an order status.');
      return;
    }

    if ('error' in orderStatus) {
      console.error('The order was rejected:', orderStatus.error);
      return;
    }

    if ('filled' in orderStatus) {
      console.log('The order filled immediately:', orderStatus.filled);
      return;
    }

    orderId = orderStatus.resting.oid;
    console.log('Resting order ID:', orderId);
  } catch (error) {
    console.error('Order submission failed:', error);
    return;
  }

  try {
    const currentOrder = await client.getOrderStatus({ oid: orderId });
    console.log('Order before cancellation:', currentOrder);
  } catch (error) {
    console.error('Order-status request failed:', error);
  }

  try {
    const cancellation = await client.cancelOrdersByClientOrderId({
      cancels: [{ asset: 'BTC', cloid: clientOrderId }],
    });
    console.log('Cancellation response:', cancellation);
  } catch (error) {
    console.error('Cancellation failed:', error);
    return;
  }

  try {
    const finalOrder = await client.getOrderStatus({ oid: clientOrderId });
    console.log('Final order state:', finalOrder);
  } catch (error) {
    console.error('Final order-status request failed:', error);
  }
}

main();
```

The fifth bid is already a valid Hyperliquid price and normally remains below the best ask, which makes it suitable for an add-liquidity-only order. The size targets at least 12 USDC of notional and rounds up to the asset's `szDecimals`, keeping it above Hyperliquid's current 10 USDC minimum order value.

`postOnly: true` maps to Hyperliquid's `Alo` time in force. Without `postOnly`, `submitLimitOrder()` defaults to good-till-cancelled. Set `timeInForce: 'IOC'` for immediate-or-cancel.

The `clientOrderId` is 16 random bytes encoded as a 32-character hexadecimal string. Keep it with the local order record. It can be used with `getOrderStatus()` and `cancelOrdersByClientOrderId()` when the numeric exchange order ID is not yet known.

### 7. Run a Spot REST API order lifecycle

Spot orders use the same helper, but the symbol resolves to a Spot asset ID and size means base-asset quantity. This example places a post-only PURR/USDC buy on Testnet.

<!-- siebly:snippet id="spot-order" -->

```javascript
import { randomBytes } from 'node:crypto';
import { RestClient } from '@siebly/hyperliquid-api';

const privateKey = process.env.HYPERLIQUID_TESTNET_API_WALLET_KEY;
const accountAddress = process.env.HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS;

if (!privateKey || !accountAddress) {
  throw new Error(
    'Set HYPERLIQUID_TESTNET_API_WALLET_KEY and HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS before starting.',
  );
}

const client = new RestClient({
  privateKey,
  accountAddress,
  testnet: true,
});

function trimDecimal(value) {
  if (!value.includes('.')) {
    return value;
  }
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

function sizeForNotional(price, szDecimals, targetNotional) {
  const factor = 10 ** szDecimals;
  const size = Math.ceil((targetNotional / Number(price)) * factor) / factor;
  return trimDecimal(size.toFixed(szDecimals));
}

async function main() {
  let asset;
  let orderBook;

  try {
    asset = await client.resolveAsset('PURR/USDC');
    console.log('PURR/USDC asset:', asset);
  } catch (error) {
    console.error('Spot asset resolution failed:', error);
    return;
  }

  if (asset.szDecimals === undefined) {
    console.error('PURR/USDC size metadata was not available.');
    return;
  }

  try {
    orderBook = await client.getOrderBook({ coin: 'PURR/USDC' });
    console.log('PURR/USDC order book received at:', orderBook?.time);
  } catch (error) {
    console.error('Spot order-book request failed:', error);
    return;
  }

  const bid = orderBook?.levels[0][4] ?? orderBook?.levels[0][0];

  if (!bid) {
    console.error('The PURR/USDC order book did not contain a bid.');
    return;
  }

  const clientOrderId = `0x${randomBytes(16).toString('hex')}`;
  const size = sizeForNotional(bid.px, asset.szDecimals, 12);
  let orderId;

  try {
    const result = await client.submitLimitOrder({
      symbol: 'PURR/USDC',
      side: 'buy',
      price: bid.px,
      size,
      postOnly: true,
      clientOrderId,
    });
    console.log('Spot order response:', result);

    if (result.status !== 'ok') {
      console.error('Hyperliquid rejected the order request:', result.response);
      return;
    }

    const orderStatus = result.response.data?.statuses[0];

    if (!orderStatus) {
      console.error('The order response did not contain an order status.');
      return;
    }

    if ('error' in orderStatus) {
      console.error('The order was rejected:', orderStatus.error);
      return;
    }

    if ('filled' in orderStatus) {
      console.log('The order filled immediately:', orderStatus.filled);
      return;
    }

    orderId = orderStatus.resting.oid;
    console.log('Resting Spot order ID:', orderId);
  } catch (error) {
    console.error('Spot order submission failed:', error);
    return;
  }

  try {
    const currentOrder = await client.getOrderStatus({ oid: orderId });
    console.log('Spot order before cancellation:', currentOrder);
  } catch (error) {
    console.error('Spot order-status request failed:', error);
  }

  try {
    const cancellation = await client.cancelOrdersByClientOrderId({
      cancels: [{ asset: 'PURR/USDC', cloid: clientOrderId }],
    });
    console.log('Spot cancellation response:', cancellation);
  } catch (error) {
    console.error('Spot cancellation failed:', error);
    return;
  }

  try {
    const finalOrder = await client.getOrderStatus({ oid: clientOrderId });
    console.log('Final Spot order state:', finalOrder);
  } catch (error) {
    console.error('Final Spot order-status request failed:', error);
  }
}

main();
```

The account needs enough Testnet USDC to reserve the order. A Spot sell needs the corresponding base asset. Hyperliquid may return internal token names in balances, so use the names returned by the API when reconciling funds.

### Market orders, closing positions, and leverage

`submitMarketOrder()` is an immediate-or-cancel limit order with a protection price. When `price` is omitted, the SDK loads the current midpoint, applies `maxSlippage`, rounds the protection price to Hyperliquid's rules, and rounds size down to `szDecimals`.

Call `submitMarketOrder()` with `symbol`, `side`, `size`, and an optional `maxSlippage`. For example, a BTC buy can use `{ symbol: 'BTC', side: 'buy', size: '0.001', maxSlippage: 0.01 }`.

`submitMarketClose()` reads the current perpetual position, chooses the closing side, and submits a reduce-only immediate-or-cancel order. Omit `size` to close the full position.

Call `submitMarketClose()` with the perpetual symbol and an optional `maxSlippage`. Add `size` when only part of the position should be closed.

Call `updateLeverage()` with `{ asset: 'BTC', isCross: true, leverage: 3 }` to select three-times cross leverage for BTC. Use the current asset metadata and account limits when choosing leverage.

These are signed production actions on Mainnet and signed test actions on Testnet. Read current account and market state before calling them.

<!-- siebly:section id="websocket-api" -->

## Send Info and Exchange requests with the WebSocket API

`WebsocketAPIClient` exposes the same promise-based methods as `RestClient`, but sends supported Info and Exchange requests through Hyperliquid's WebSocket POST protocol.

The SDK opens the connection when needed, assigns a unique request ID, matches the response to the promise, and rejects protocol errors. The raw `id` and response wrapper do not need to be managed by application code.

This example reads market data, submits a post-only BTC Testnet order, and cancels it through the WebSocket API.

<!-- siebly:snippet id="websocket-api" -->

```javascript
import { randomBytes } from 'node:crypto';
import { WebsocketAPIClient } from '@siebly/hyperliquid-api';

const privateKey = process.env.HYPERLIQUID_TESTNET_API_WALLET_KEY;
const accountAddress = process.env.HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS;

if (!privateKey || !accountAddress) {
  throw new Error(
    'Set HYPERLIQUID_TESTNET_API_WALLET_KEY and HYPERLIQUID_TESTNET_ACCOUNT_ADDRESS before starting.',
  );
}

const client = new WebsocketAPIClient({
  privateKey,
  accountAddress,
  testnet: true,
});

function trimDecimal(value) {
  if (!value.includes('.')) {
    return value;
  }
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

function sizeForNotional(price, szDecimals, targetNotional) {
  const factor = 10 ** szDecimals;
  const size = Math.ceil((targetNotional / Number(price)) * factor) / factor;
  return trimDecimal(size.toFixed(szDecimals));
}

async function main() {
  client
    .on('open', ({ wsKey }) => {
      console.log('WebSocket API opened:', wsKey);
    })
    .on('reconnected', ({ wsKey }) => {
      console.log('WebSocket API reconnected:', wsKey);
    })
    .on('exception', ({ wsKey, event }) => {
      console.error('WebSocket API exception:', wsKey, event);
    });

  let btc;
  let orderBook;

  try {
    const metadata = await client.getPerpMetadata();
    btc = metadata.universe.find((asset) => asset.name === 'BTC');
    console.log('BTC metadata:', btc);
  } catch (error) {
    console.error('WebSocket metadata request failed:', error);
    client.closeAll();
    return;
  }

  if (!btc) {
    console.error('BTC was not returned by the Testnet perpetual metadata.');
    client.closeAll();
    return;
  }

  try {
    orderBook = await client.getOrderBook({ coin: 'BTC' });
    console.log('BTC order book received at:', orderBook?.time);
  } catch (error) {
    console.error('WebSocket order-book request failed:', error);
    client.closeAll();
    return;
  }

  const bid = orderBook?.levels[0][4] ?? orderBook?.levels[0][0];

  if (!bid) {
    console.error('The BTC order book did not contain a bid.');
    client.closeAll();
    return;
  }

  const clientOrderId = `0x${randomBytes(16).toString('hex')}`;
  const size = sizeForNotional(bid.px, btc.szDecimals, 12);
  let orderId;

  try {
    const result = await client.submitLimitOrder({
      symbol: 'BTC',
      side: 'buy',
      price: bid.px,
      size,
      postOnly: true,
      clientOrderId,
    });
    console.log('WebSocket order response:', result);

    if (result.status !== 'ok') {
      console.error('Hyperliquid rejected the order request:', result.response);
      client.closeAll();
      return;
    }

    const orderStatus = result.response.data?.statuses[0];

    if (!orderStatus) {
      console.error('The order response did not contain an order status.');
      client.closeAll();
      return;
    }

    if ('error' in orderStatus) {
      console.error('The order was rejected:', orderStatus.error);
      client.closeAll();
      return;
    }

    if ('filled' in orderStatus) {
      console.log('The order filled immediately:', orderStatus.filled);
      client.closeAll();
      return;
    }

    orderId = orderStatus.resting.oid;
    console.log('Resting order ID:', orderId);
  } catch (error) {
    console.error('WebSocket order submission failed:', error);
    client.closeAll();
    return;
  }

  try {
    const currentOrder = await client.getOrderStatus({ oid: orderId });
    console.log('Order before cancellation:', currentOrder);
  } catch (error) {
    console.error('WebSocket order-status request failed:', error);
  }

  try {
    const cancellation = await client.cancelOrdersByClientOrderId({
      cancels: [{ asset: 'BTC', cloid: clientOrderId }],
    });
    console.log('WebSocket cancellation response:', cancellation);
  } catch (error) {
    console.error('WebSocket cancellation failed:', error);
  }

  try {
    const finalOrder = await client.getOrderStatus({ oid: clientOrderId });
    console.log('Final WebSocket order state:', finalOrder);
  } catch (error) {
    console.error('Final WebSocket order-status request failed:', error);
  }

  client.closeAll();
}

main();
```

WebSocket POST supports Info requests and signed Exchange actions. Explorer requests are not supported. Use `WebsocketClient` for subscriptions and `WebsocketAPIClient` for awaitable request-response calls.

An order-command response acknowledges the action and reports its immediate status. Confirm later changes through `orderUpdates` or `getOrderStatus()`. That distinction is important when an order fills or is cancelled immediately after its first response.

## Explore more REST API methods

`RestClient` covers Hyperliquid's wider Info and Exchange surfaces. The following groups are a starting map rather than a complete list.

### Market and account information

| Workflow | Representative methods |
| --- | --- |
| Perpetual markets | `getPerpMetadata()`, `getPerpAssetContexts()`, `getFundingHistory()`, `getPredictedFundingRates()` |
| Spot markets | `getSpotMetadata()`, `getSpotAssetContexts()`, `getTokenDetails()` |
| Books and trades | `getOrderBook()`, `getAllMids()`, `getCandles()`, `getRecentTrades()` |
| Orders and fills | `getOpenOrders()`, `getFrontendOpenOrders()`, `getOrderStatus()`, `getOrderHistory()`, `getUserFills()` |
| Account and risk | `getPerpAccountSummary()`, `getSpotBalances()`, `getPortfolio()`, `getUserFees()`, `getUserRateLimit()` |
| HIP-3 perpetual DEXs | `getPerpDexs()`, `getPerpDexStatus()`, `getPerpDexLimits()`, `getAllPerpMetadata()` |
| Outcome markets | `getOutcomeMetadata()`, `getSettledOutcome()` |
| Vaults and staking | `getVaultDetails()`, `getVaultSummaries()`, `getStakingSummary()`, `getStakingDelegations()` |
| Borrow and lend | `getAllBorrowLendReserveStates()`, `getBorrowLendReserveState()`, `getUserBorrowLendState()` |
| Subaccounts and signers | `getSubAccounts()`, `getExtraAgents()`, `getMultiSigSigners()`, `getUserRole()` |

### Signed actions

| Workflow | Representative methods |
| --- | --- |
| Orders | `submitOrder()`, `submitMarketOrder()`, `submitLimitOrder()`, `modifyOrder()`, `cancelOrders()` |
| Position management | `submitMarketClose()`, `updateLeverage()`, `updateIsolatedMargin()`, `setIsolatedMarginLeverage()` |
| TWAP and safety | `submitTwapOrder()`, `cancelTwapOrder()`, `setCancelAllAfter()` |
| Transfers | `sendUsd()`, `sendSpotAsset()`, `sendAsset()`, `transferUsdBetweenSpotAndPerp()`, `withdrawUsd()` |
| Subaccounts and vaults | `createSubAccount()`, `transferUsdToOrFromSubAccount()`, `createVault()`, `transferVaultFunds()` |
| Staking | `depositIntoStaking()`, `withdrawFromStaking()`, `delegateOrUndelegateStake()`, `claimRewards()` |
| Account configuration | `approveApiWallet()`, `setUserPortfolioMargin()`, `setUserAbstraction()`, `setUserDexAbstraction()` |
| Advanced deployment | `deployPerp()`, `deploySpot()`, `submitUserOutcome()`, validator and multisig methods |

Use the focused [repository examples](../examples) and exported request types when moving beyond the workflows in this guide. Transfers, withdrawals, staking, account configuration, deployer operations, and multisig actions change funds or account settings, so confirm their current official requirements before using them.

### Batch orders, TP/SL, and dead-man switches

Use `submitOrder()` when sending native wire-shaped batches or TP/SL orders. A batch is one request for IP limits but each order still counts toward address-based limits. Inspect every returned status, because errors usually align with individual batch entries.

`setCancelAllAfter()` schedules cancellation of open orders if the account stops refreshing the deadline. Hyperliquid currently requires the trigger to be at least five seconds in the future and limits each account to ten scheduled-cancel triggers per UTC day. Refresh it from a monitored process, and call the method without `time` to remove the schedule when the strategy stops normally.

Set `expiresAfter: Date.now() + 10_000` in the second argument of a signed method when an action should expire after ten seconds. This adds an action deadline. It does not replace order time in force or a dead-man switch.

### Vaults and subaccounts

Set `vaultAddress` on the client when all signed actions belong to one vault or subaccount:

```javascript
import { RestClient } from '@siebly/hyperliquid-api';

const privateKey = process.env.HYPERLIQUID_API_WALLET_KEY;
const accountAddress = process.env.HYPERLIQUID_ACCOUNT_ADDRESS;
const vaultAddress = process.env.HYPERLIQUID_VAULT_ADDRESS;

if (!privateKey || !accountAddress || !vaultAddress) {
  throw new Error(
    'Set HYPERLIQUID_API_WALLET_KEY, HYPERLIQUID_ACCOUNT_ADDRESS, and HYPERLIQUID_VAULT_ADDRESS before starting.',
  );
}

const client = new RestClient({
  privateKey,
  accountAddress,
  vaultAddress,
});
```

The signer still owns the nonce. A single API wallet used across several vaults or subaccounts shares one nonce set. Separate signers are easier to operate safely when those accounts trade concurrently.

### Custom signers

`privateKey` is the simplest server-side option. Applications that keep keys in another wallet system can pass a signer with `signTypedData` instead:

```javascript
import { RestClient } from '@siebly/hyperliquid-api';

export function createHyperliquidClient(walletClient, walletAddress) {
  return new RestClient({
    accountAddress: walletAddress,
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
}
```

The signer may expose `address` or `getAddress()`. The SDK handles Hyperliquid's two signature schemes and required MessagePack field ordering.

## Recover account state after a reconnect

Subscriptions are restored after a reconnect, but updates that occurred during the gap still need to be reconciled. Reload the account state required by the process, build a replacement snapshot, then publish it only after every required read succeeds.

This example refreshes balances, open orders, and recent fills when an account-stream connection returns.

<!-- siebly:snippet id="reconnect-recovery" -->

```javascript
import { RestClient, WebsocketClient } from '@siebly/hyperliquid-api';

const accountAddress = process.env.HYPERLIQUID_ACCOUNT_ADDRESS;

if (!accountAddress) {
  throw new Error('Set HYPERLIQUID_ACCOUNT_ADDRESS before starting.');
}

const restClient = new RestClient({ accountAddress });
const websocketClient = new WebsocketClient();

let accountState = {
  balances: undefined,
  openOrders: [],
  recentFills: [],
};

async function reloadAccountState() {
  let balances;
  let openOrders;
  let recentFills;

  try {
    balances = await restClient.getBalances();
  } catch (error) {
    console.error('Balance recovery failed:', error);
    return;
  }

  try {
    openOrders = await restClient.getOpenOrders();
  } catch (error) {
    console.error('Open-order recovery failed:', error);
    return;
  }

  try {
    recentFills = await restClient.getUserFills({
      aggregateByTime: true,
    });
  } catch (error) {
    console.error('Fill recovery failed:', error);
    return;
  }

  accountState = {
    balances,
    openOrders,
    recentFills,
  };

  console.log('Recovered account state:', accountState);
}

async function main() {
  websocketClient
    .on('reconnected', async ({ wsKey }) => {
      console.log('WebSocket reconnected:', wsKey);
      await reloadAccountState();
    })
    .on('exception', ({ wsKey, event }) => {
      console.error('WebSocket exception:', wsKey, event);
    });

  try {
    await websocketClient.subscribe(
      { type: 'orderUpdates', user: accountAddress },
      (orders) => {
        console.log('Order updates:', orders);
      },
    );
  } catch (error) {
    console.error('Order subscription failed:', error);
  }

  try {
    await websocketClient.subscribe(
      { type: 'userFills', user: accountAddress, aggregateByTime: true },
      (update) => {
        console.log('Fill update:', update);
      },
    );
  } catch (error) {
    console.error('Fill subscription failed:', error);
  }

  await reloadAccountState();
}

main();
```

This is [REST API hydration](https://siebly.io/reference/glossary#rest-hydration): rebuilding trusted [account state](https://siebly.io/reference/glossary#accountstate) from current REST API reads after a stream gap. Use [Scoped Recovery](https://siebly.io/reference/glossary#scoped-recovery) to reload only the state owned by the affected connection, and see [Exchange State](https://siebly.io/reference/exchange-state) and [Runtime Workflows](https://siebly.io/reference/runtime-workflows) for wider state-management patterns.

If the process stores a durable fill cursor, reload by time and deduplicate by trade ID before replacing state. The initial `userFills` snapshot after resubscription may overlap with the REST API result.

<!-- siebly:section id="api-hosts" -->

## Choose Mainnet, Testnet, or custom API hosts

| Network | REST API host | WebSocket host |
| --- | --- | --- |
| Mainnet | `https://api.hyperliquid.xyz` | `wss://api.hyperliquid.xyz/ws` |
| Testnet | `https://api.hyperliquid-testnet.xyz` | `wss://api.hyperliquid-testnet.xyz/ws` |

Mainnet is the default. Set `testnet: true` on every client that belongs to a Testnet workflow.

<!-- siebly:snippet id="api-host-routing" -->

```javascript
import {
  RestClient,
  WebsocketAPIClient,
  WebsocketClient,
} from '@siebly/hyperliquid-api';

const mainnetRest = new RestClient();
const mainnetStreams = new WebsocketClient();
const mainnetWebsocketApi = new WebsocketAPIClient();

const testnetRest = new RestClient({ testnet: true });
const testnetStreams = new WebsocketClient({ testnet: true });
const testnetWebsocketApi = new WebsocketAPIClient({ testnet: true });

const restApiUrl = process.env.HYPERLIQUID_REST_API_URL;
const websocketUrl = process.env.HYPERLIQUID_WEBSOCKET_URL;

if (!restApiUrl || !websocketUrl) {
  throw new Error(
    'Set HYPERLIQUID_REST_API_URL and HYPERLIQUID_WEBSOCKET_URL before using custom hosts.',
  );
}

const customRest = new RestClient({
  baseUrl: restApiUrl,
});

const customStreams = new WebsocketClient({
  baseUrl: restApiUrl,
  wsUrl: websocketUrl,
});

console.log({
  mainnetRest,
  mainnetStreams,
  mainnetWebsocketApi,
  testnetRest,
  testnetStreams,
  testnetWebsocketApi,
  customRest,
  customStreams,
});
```

`baseUrl` changes REST API routing. `wsUrl` changes WebSocket routing. `WebsocketClient` may use REST API metadata while normalizing readable asset aliases, so set both values when routing it through custom infrastructure.

Keep Mainnet and Testnet private keys, account addresses, client order IDs, and persistent state in separate configuration. Asset IDs and available markets can differ between the two networks.

## Use a proxy with the REST API and WebSockets

Install the proxy agent needed by your network:

```bash
npm install https-proxy-agent socks-proxy-agent ws
```

The REST API client accepts Axios network options as its second constructor argument. WebSocket clients accept a custom WebSocket constructor. These are separate routes, so configure and test each one.

See [Using a Proxy with Siebly SDKs](https://siebly.io/blog/using-proxy-with-siebly-sdks) for deployment and troubleshooting guidance.

### HTTP or HTTPS proxy

`HttpsProxyAgent` supports both HTTP and HTTPS proxy URLs.

<!-- siebly:snippet id="http-proxy" -->

```javascript
import { HttpsProxyAgent } from 'https-proxy-agent';
import WebSocket from 'ws';
import {
  RestClient,
  WebsocketAPIClient,
  WebsocketClient,
} from '@siebly/hyperliquid-api';

const proxyUrl = process.env.HYPERLIQUID_PROXY_URL;

if (!proxyUrl) {
  throw new Error('Set HYPERLIQUID_PROXY_URL before starting.');
}

const agent = new HttpsProxyAgent(proxyUrl);
const parsedProxy = new URL(proxyUrl);
const axiosProxy = {
  protocol: parsedProxy.protocol.slice(0, -1),
  host: parsedProxy.hostname,
  port: Number(
    parsedProxy.port || (parsedProxy.protocol === 'https:' ? 443 : 80),
  ),
  ...(parsedProxy.username
    ? {
        auth: {
          username: decodeURIComponent(parsedProxy.username),
          password: decodeURIComponent(parsedProxy.password),
        },
      }
    : {}),
};

class ProxyWebSocket {
  constructor(url) {
    this.socket = Reflect.construct(WebSocket, [url, { agent }]);
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    this.socket.onopen = () => this.onopen?.();
    this.socket.onmessage = (event) => this.onmessage?.({ data: event.data });
    this.socket.onerror = (event) => this.onerror?.(event);
    this.socket.onclose = (event) =>
      this.onclose?.({ code: event.code, reason: String(event.reason) });
  }

  get readyState() {
    return this.socket.readyState;
  }

  send(data) {
    this.socket.send(data);
  }

  close(code, reason) {
    this.socket.close(code, reason);
  }
}

const restClient = new RestClient(
  { keepAlive: false },
  {
    httpsAgent: agent,
    proxy: false,
  },
);

const websocketClient = new WebsocketClient({
  requestOptions: {
    proxy: axiosProxy,
  },
  webSocketConstructor: ProxyWebSocket,
});

const websocketApiClient = new WebsocketAPIClient({
  webSocketConstructor: ProxyWebSocket,
});

async function main() {
  try {
    const status = await restClient.getExchangeStatus();
    console.log('REST API through proxy:', status);
  } catch (error) {
    console.error('Proxied REST API request failed:', error);
  }

  try {
    await websocketClient.subscribe({ type: 'allMids' }, (update) => {
      console.log('Stream through proxy:', update.mids.BTC);
    });
  } catch (error) {
    console.error('Proxied stream subscription failed:', error);
  }

  try {
    const mids = await websocketApiClient.getAllMids();
    console.log('WebSocket API through proxy:', mids.BTC);
  } catch (error) {
    console.error('Proxied WebSocket API request failed:', error);
  }
}

main();
```

Set `keepAlive: false` so the SDK preserves the custom agent, and set `proxy: false` so Axios does not apply separate environment-proxy handling on top of it.

`webSocketConstructor` routes the socket itself. `requestOptions.proxy` routes the REST API metadata requests used by asset-specific subscriptions. The `allMids` example does not need metadata resolution, but both routes are configured so the same client can later subscribe to books, trades, or candles.

### SOCKS5 proxy

<!-- siebly:snippet id="socks-proxy" -->

```javascript
import { SocksProxyAgent } from 'socks-proxy-agent';
import WebSocket from 'ws';
import {
  RestClient,
  WebsocketAPIClient,
  WebsocketClient,
} from '@siebly/hyperliquid-api';

const proxyUrl = process.env.HYPERLIQUID_SOCKS_PROXY_URL;

if (!proxyUrl) {
  throw new Error('Set HYPERLIQUID_SOCKS_PROXY_URL before starting.');
}

const agent = new SocksProxyAgent(proxyUrl);

class ProxyWebSocket {
  constructor(url) {
    this.socket = Reflect.construct(WebSocket, [url, { agent }]);
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    this.socket.onopen = () => this.onopen?.();
    this.socket.onmessage = (event) => this.onmessage?.({ data: event.data });
    this.socket.onerror = (event) => this.onerror?.(event);
    this.socket.onclose = (event) =>
      this.onclose?.({ code: event.code, reason: String(event.reason) });
  }

  get readyState() {
    return this.socket.readyState;
  }

  send(data) {
    this.socket.send(data);
  }

  close(code, reason) {
    this.socket.close(code, reason);
  }
}

const restClient = new RestClient(
  { keepAlive: false },
  {
    httpsAgent: agent,
    proxy: false,
  },
);

const websocketClient = new WebsocketClient({
  webSocketConstructor: ProxyWebSocket,
});

const websocketApiClient = new WebsocketAPIClient({
  webSocketConstructor: ProxyWebSocket,
});

async function main() {
  try {
    const status = await restClient.getExchangeStatus();
    console.log('REST API through SOCKS5:', status);
  } catch (error) {
    console.error('SOCKS5 REST API request failed:', error);
  }

  try {
    await websocketClient.subscribe({ type: 'allMids' }, (update) => {
      console.log('WebSocket through SOCKS5:', update.mids.BTC);
    });
  } catch (error) {
    console.error('SOCKS5 stream subscription failed:', error);
  }

  try {
    const mids = await websocketApiClient.getAllMids();
    console.log('WebSocket API through SOCKS5:', mids.BTC);
  } catch (error) {
    console.error('SOCKS5 WebSocket API request failed:', error);
  }
}

main();
```

Set `keepAlive: false` so the REST API client preserves the SOCKS agent. The WebSocket example uses `allMids` because it does not trigger a separate REST API metadata lookup. The current WebSocket client does not expose a keepalive override for its internal metadata client, so do not assume an asset-alias lookup follows the SOCKS route.

A proxy changes the network route, not the account, network, or available products. Monitor latency, disconnects, and the proxy's egress IP.

## Understand Siebly referral and builder settings

The SDK includes two separate Hyperliquid features:

- Referral code: around the first supported trading action from a client instance, the SDK makes one passive attempt to apply `SIEBLY`. Hyperliquid leaves an existing referrer unchanged. Trading continues if the referral request fails.
- Builder code: after the account has approved Siebly's builder fee, the SDK can include the builder code on eligible orders. The configured maximum is 0.01%. Approval must be signed by the main wallet, not an API wallet. If a main-wallet private key is configured and approval is missing, the SDK may attempt that approval in the background. An API wallet cannot grant it.

Builder approval is optional. Call `approveBuilderFee()` only from a client configured with the main wallet signer and only after reviewing Hyperliquid's current [builder-code documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes). The approval sets a maximum and can be revoked through Hyperliquid.

## Production checklist

- **Keep signers isolated.** Use a separate approved API wallet per trading process and, where practical, per subaccount.
- **Query the correct address.** Account reads use the master account, subaccount, or vault address rather than the API wallet address.
- **Keep time synchronized.** Signed nonces are millisecond timestamps and must remain inside Hyperliquid's accepted time window.
- **Use exact decimal strings.** Avoid JavaScript floating-point arithmetic for stored financial values. Trim trailing decimal zeroes before native wire-shaped actions.
- **Read current metadata.** Resolve assets and use the latest `szDecimals`, universe names, margin tables, and market status.
- **Meet minimum notional.** Hyperliquid currently requires at least 10 units of the quote asset for an order.
- **Check every action status.** A top-level `ok` response may contain an order-specific `error` entry.
- **Reconcile uncertain writes.** Query by [custom order ID](https://siebly.io/reference/glossary#custom-order-id) before retrying a timed-out submission.
- **Confirm final order state.** Treat the first response as [pending confirmation](https://siebly.io/reference/glossary#pending-confirmation), then use `getOrderStatus()` or `orderUpdates`.
- **Use action deadlines where useful.** `expiresAfter` limits how long a signed action remains valid. A stale deadline rejection currently consumes extra address-based rate-limit allowance.
- **Use a dead-man switch.** Refresh `setCancelAllAfter()` from a monitored process when unattended resting orders need automatic cancellation.
- **Recover after gaps.** Rebuild the affected balances, positions, orders, and fills after a reconnect.
- **Respect current limits.** Hyperliquid applies IP, address, open-order, connection, subscription, and in-flight request limits. Check the current [rate-limit documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits).
- **Keep keys server-side.** Browser use should be limited to public REST API calls and public-address WebSocket subscriptions.
- **Monitor the route.** Track latency, reconnect frequency, and egress IP when using a proxy or custom endpoint.

## Frequently asked questions

### Can I use the SDK with plain JavaScript?

Yes. All examples in this guide are JavaScript. The package also includes TypeScript declarations.

### Which client should I start with?

Start with `RestClient` for public market data and account state. Add `WebsocketClient` for live subscriptions. Use `WebsocketAPIClient` when you need awaitable Info or Exchange requests over WebSocket.

### Why do account reads work without a private key?

Hyperliquid Info queries use a public account address. A signer is needed for Exchange actions that change orders, funds, leverage, or account settings.

### Why are my balances empty when I use an API wallet?

Account queries need the master account, subaccount, or vault address. The API wallet address identifies the signer, not the account whose state is being queried. Set `accountAddress` on the client.

### What is the difference between a wallet and an API wallet?

The main wallet owns the account. An approved API wallet signs actions on its behalf. Use an API wallet for an automated process and keep the main wallet key outside that process.

### Why are REST API response shapes different?

Hyperliquid's Info endpoint selects an operation through the request body, and each operation has its own response schema. The SDK returns that response directly.

### Why did an order fail when the response status was `ok`?

The top-level status describes the action request. Each order has its own entry under `response.data.statuses`, which may contain `resting`, `filled`, or `error`.

### Does `submitMarketOrder()` send a native market order?

It sends an immediate-or-cancel limit order with a protection price. The SDK derives and rounds that price from the midpoint when one is not supplied.

### How do I tell perpetual and Spot assets apart?

Perpetuals commonly use names such as `BTC`. Spot markets use native universe names such as `PURR/USDC` or `@107`. The SDK also accepts readable metadata-derived aliases such as `HYPE/USDC`.

### Do account WebSocket streams require authentication?

They use the public account address. The SDK isolates user-scoped channels when needed and resubscribes after reconnecting.

### How do subscription acknowledgements appear?

The SDK handles acknowledgement protocol messages internally. Subscription callbacks receive the channel's snapshot or update data.

### What is the difference between `WebsocketClient` and `WebsocketAPIClient`?

`WebsocketClient` consumes ongoing subscriptions. `WebsocketAPIClient` sends one Info or Exchange request and resolves the matching response as a promise.

### Should I retry a timed-out order submission?

Not immediately. Query `getOrderStatus()` with the client order ID first. A request can reach Hyperliquid even when the response does not reach your process.

### How do I use a vault or subaccount?

Set its address as `vaultAddress` for signed actions and use the same address for its account-state queries. The API wallet must be approved to act for the relevant account.

### Can I use Mainnet credentials on Testnet?

Keep the networks separate. Approval state, account balances, assets, and API-wallet registration differ between Mainnet and Testnet.

### Does a proxy change which network I use?

No. `testnet`, `baseUrl`, and `wsUrl` select the destination. A proxy only changes the network path used to reach it.

## Next steps

1. Run the public REST API example and inspect the current BTC metadata and order book.
2. Set a public account address and load balances, positions, open orders, and fills.
3. Add public and account WebSocket subscriptions, including reconnect handling.
4. Approve a Testnet API wallet and run the perpetual order lifecycle.
5. Add client order IDs, action deadlines, dead-man-switch refresh, and scoped recovery before moving a strategy to Mainnet.

Continue with the [Hyperliquid SDK examples](https://siebly.io/examples/Hyperliquid), browse the [source repository](https://github.com/sieblyio/hyperliquid-api), and check the [official Hyperliquid API documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api) for current exchange behavior.
