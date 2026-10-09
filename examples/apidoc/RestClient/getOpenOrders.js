import { RestClient } from '@siebly/hyperliquid-api';
// or, if require is preferred:
// const { RestClient } = require('@siebly/hyperliquid-api');

// This example shows how to call this Hyperliquid API endpoint with either node.js, javascript (js) or typescript (ts) with the npm module "@siebly/hyperliquid-api" for Hyperliquid exchange
// This Hyperliquid API SDK is available on npm via "npm install @siebly/hyperliquid-api"
// ENDPOINT: /info (openOrders)
// METHOD: POST
// PUBLIC: YES

// Account reads use the public address of the master account, subaccount, or vault.
const client = new RestClient({
  accountAddress: '0x...',
});

client.getOpenOrders(params)
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });
