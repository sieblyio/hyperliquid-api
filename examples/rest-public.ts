import { RestClient } from '../src/index.js';

const client = new RestClient();

// Info remaps pair aliases like the official Python SDK: HYPE/USDC -> @107.
// PURR/USDC stays PURR/USDC because that is the universe name.
const [mids, book, purr, hypeBook] = await Promise.all([
  client.getAllMids(),
  client.getOrderBook({
    coin: 'BTC',
    nSigFigs: 5,
    mantissa: 1,
  }),
  client.getOrderBook({ coin: 'PURR/USDC' }),
  client.getOrderBook({ coin: 'HYPE/USDC' }),
]);

console.log('BTC mid:', mids.BTC);
console.log('Best bid:', book?.levels[0][0]);
console.log('PURR book:', purr?.levels[0]?.[0]);
console.log('HYPE info coin:', await client.nameToCoin('HYPE/USDC'));
console.log('HYPE book:', hypeBook?.levels[0]?.[0]);
