import { RestClient } from '../../../src/index.js';

// Live public coverage. Hyperliquid REST is POST-only (/info), so this maps
// to the other SDKs' public GET without params / GET with query params matrix.
describe('REST PUBLIC', () => {
  const rest = new RestClient();

  describe('public POST without params', () => {
    it('should succeed calling getAllMids / metadata', async () => {
      const [mids, meta, spotMeta] = await Promise.all([
        rest.getAllMids(),
        rest.getPerpMetadata(),
        rest.getSpotMetadata(),
      ]);

      expect(Object.keys(mids).length).toBeGreaterThan(0);
      expect(meta.universe.length).toBeGreaterThan(0);
      expect(spotMeta.universe.length).toBeGreaterThan(0);
    });

    it('should succeed calling getExchangeStatus', async () => {
      const res = await rest.getExchangeStatus();

      expect(res).toBeDefined();
    });
  });

  describe('public POST with params', () => {
    it('should succeed calling getOrderBook with coin', async () => {
      const res = await rest.getOrderBook({ coin: 'BTC' });

      expect(res).toMatchObject({
        coin: 'BTC',
        levels: [expect.any(Array), expect.any(Array)],
        time: expect.any(Number),
      });
    });

    it('should succeed calling getCandles with params', async () => {
      const res = await rest.getCandles({
        coin: 'BTC',
        interval: '1m',
        startTime: Date.now() - 60_000,
      });

      expect(Array.isArray(res)).toBe(true);
    });

    it('should succeed calling getRecentTrades with coin', async () => {
      const res = await rest.getRecentTrades({ coin: 'BTC' });

      expect(res).toBeDefined();
    });
  });
});
