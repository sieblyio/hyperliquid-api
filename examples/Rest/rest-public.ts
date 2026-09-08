import { RestClient } from '../../src/index.js';

// or
// import { RestClient } from '@siebly/hyperliquid-api';

/**
 * Public Info calls do not need a private key.
 *
 * npx tsx examples/Rest/rest-public.ts
 */
const client = new RestClient();

// Use testnet instead:
// const client = new RestClient({ testnet: true });

(async () => {
  try {
    const status = await client.getExchangeStatus();
    console.log('exchange status:', status);

    const mids = await client.getAllMids();
    console.log('BTC mid:', mids.BTC);
    console.log('ETH mid:', mids.ETH);

    // nSigFigs is optional aggregation. Some nSigFigs+mantissa combos 500 on
    // Hyperliquid's side; start with nSigFigs alone.
    const book = await client.getOrderBook({
      coin: 'BTC',
      nSigFigs: 5,
    });
    console.log('BTC best bid:', book?.levels[0]?.[0]);
    console.log('BTC best ask:', book?.levels[1]?.[0]);

    // Info remaps pair aliases like the official Python SDK: HYPE/USDC -> @107.
    // PURR/USDC stays PURR/USDC because that is the universe name.
    const [purr, hypeBook, hypeCoin] = await Promise.all([
      client.getOrderBook({ coin: 'PURR/USDC' }),
      client.getOrderBook({ coin: 'HYPE/USDC' }),
      client.nameToCoin('HYPE/USDC'),
    ]);
    console.log('PURR book:', purr?.levels[0]?.[0]);
    console.log('HYPE info coin:', hypeCoin);
    console.log('HYPE book:', hypeBook?.levels[0]?.[0]);

    const asset = await client.resolveAsset('HYPE/USDC');
    console.log('resolved HYPE/USDC:', {
      assetId: asset.assetId,
      canonicalName: asset.canonicalName,
      kind: asset.kind,
      szDecimals: asset.szDecimals,
    });

    const candles = await client.getCandles({
      coin: 'BTC',
      interval: '1m',
      startTime: Date.now() - 5 * 60_000,
    });
    console.log('BTC candles:', candles.length, candles.at(-1));

    const trades = await client.getRecentTrades({ coin: 'BTC' });
    console.log(
      'BTC recent trades:',
      Array.isArray(trades) ? trades.length : trades,
      Array.isArray(trades) ? trades[0] : undefined,
    );

    const [perpMeta, spotMeta] = await Promise.all([
      client.getPerpMetadata(),
      client.getSpotMetadata(),
    ]);
    console.log(
      'perp universe size:',
      perpMeta.universe.length,
      'spot universe size:',
      spotMeta.universe.length,
    );
    console.log(
      'sample perps:',
      perpMeta.universe.slice(0, 5).map((row) => row.name),
    );

    const funding = await client.getPredictedFundingRates();
    console.log(
      'predicted funding entries:',
      Array.isArray(funding) ? funding.length : funding,
    );
  } catch (e) {
    console.error('request failed: ', e);
  }
})();
