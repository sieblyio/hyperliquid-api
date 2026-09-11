# Hyperliquid API - Examples

This folder contains ready to go examples demonstrating the SDK, written in TypeScript (they also work in JavaScript after dropping type annotations).

## Getting started

- Clone the project, or install the module: `npm install @siebly/hyperliquid-api`.
- Edit the sample as needed (some samples require a private key, or a change from `../src/index.js` to `@siebly/hyperliquid-api`).
- Execute with tsx: `npx tsx examples/Rest/rest-public.ts`.

Samples that refer to credentials via `process.env.HYPERLIQUID_PRIVATE_KEY` can be spawned with environment variables. Unix/macOS example:

```
HYPERLIQUID_PRIVATE_KEY='0xabc' npx tsx examples/Rest/rest-private.ts
```

If the key is an API/agent wallet, also pass the master account:

```
HYPERLIQUID_PRIVATE_KEY='0xabc' HYPERLIQUID_ACCOUNT_ADDRESS='0x...' npx tsx examples/Rest/rest-private.ts
```

Trading examples submit real orders on mainnet by default. Sizes are small and limit prices are far from market. Uncomment `testnet: true` in a sample to use testnet. Start with `rest-public.ts` and `rest-private.ts` before the order samples.

### REST APIs

All REST examples live in [examples/Rest](./Rest/).

- `rest-public.ts` - Public Info: mids, books, candles, trades, metadata, asset aliases.
- `rest-private.ts` - Authenticated Info reads: balances, positions, open orders, fills. No orders.
- `rest-market-order.ts` - `submitMarketOrder()` then `submitMarketClose()`.
- `rest-limit-order.ts` - GTC limit with client order id, status lookup, cancel by cloid.
- `rest-spot-order.ts` - Spot limit on `PURR/USDC`, then cancel.
- `rest-tpsl.ts` - Standalone stop plus grouped entry + TP/SL.
- `rest-leverage.ts` - Cross/isolated leverage and isolated margin.
- `rest-cancel-open-orders.ts` - Cancel every open order.
- `rest-schedule-cancel.ts` - Dead-man's switch via `setCancelAllAfter()`.
- `rest-rounding.ts` - Tick/lot rules for raw `submitOrder()` wires.

### WebSockets

All WebSocket examples live in [examples/Websocket](./Websocket/).

#### Consumers

These receive data from Hyperliquid WebSockets (market data, account updates). Data emits through `on('message')` with the original `channel`, `data`, and `wsKey`. Subscription acknowledgements emit through `on('response')`. Lifecycle events (`open`, `reconnecting`, `reconnected`, `exception`, `close`) fire on the same client. Use `subscribe()` and `unsubscribe()` to manage one topic or an array independently of listeners.

- `ws-public.ts` - Public mids, book, trades, candles, bbo, asset context.
- `ws-private.ts` - Account streams: fills, order updates, open orders, notifications. Needs `HYPERLIQUID_ADDRESS`.

#### WebSocket API

These send commands over Hyperliquid's WebSocket POST protocol. `WebsocketAPIClient` has the same methods as `RestClient`.

- `WS-API/ws-api-client.ts` - Public Info over WS, plus an optional limit + cancel when `HYPERLIQUID_PRIVATE_KEY` is set.
