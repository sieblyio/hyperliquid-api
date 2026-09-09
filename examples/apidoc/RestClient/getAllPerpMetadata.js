import { RestClient } from '@siebly/hyperliquid-api';
// or, if require is preferred:
// const { RestClient } = require('@siebly/hyperliquid-api');

// This example shows how to call this Hyperliquid API endpoint with either node.js, javascript (js) or typescript (ts) with the npm module "@siebly/hyperliquid-api" for Hyperliquid exchange
// This Hyperliquid API SDK is available on npm via "npm install @siebly/hyperliquid-api"
// ENDPOINT: /info (allPerpMetas)
// METHOD: POST
// PUBLIC: YES

const client = new RestClient();
// Private methods need a key:
// const client = new RestClient({ privateKey: 'insert_private_key_here' });

client.getAllPerpMetadata(params)
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });
