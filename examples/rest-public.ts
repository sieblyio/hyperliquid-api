import { RestClient } from '../src/index.js';

const client = new RestClient();

const [mids, book, spot] = await Promise.all([
  client.getAllMids(),
  client.getOrderBook({
    coin: 'BTC',
    nSigFigs: 5,
    mantissa: 1,
  }),
  client.resolveAsset('HYPE/USDC'),
]);

console.log('BTC mid:', mids.BTC);
console.log('Best bid:', book?.levels[0][0]);
console.log('HYPE/USDC asset:', spot);
