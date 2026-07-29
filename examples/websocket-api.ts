import { WebsocketAPIClient } from '../src/index.js';

const client = new WebsocketAPIClient();

const mids = await client.getAllMids();
console.log(mids);

client.close();
