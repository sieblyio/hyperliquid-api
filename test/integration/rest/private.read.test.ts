import { Wallet } from 'ethers';

import { RestClient } from '../../../src/index.js';

// Private Info reads. These attach the account address in the POST /info body
// and do not L1-sign. Analogous to other SDKs' private GET without/with params.
// An unused key has userRole "missing" until the first deposit, so we pass
// accountAddress explicitly. Info still returns empty balances/orders.
const privateKey = process.env.HYPERLIQUID_E2E_PRIVATE_KEY;
// Optional. Set when the key is an API wallet: Info needs the master/sub
// address because userRole is missing for an unapproved agent. Omit when the
// private key is the account itself (address is derived below).
const accountAddress =
  process.env.HYPERLIQUID_E2E_ACCOUNT_ADDRESS ??
  (privateKey ? new Wallet(privateKey).address : undefined);
const describePrivate = privateKey ? describe : describe.skip;

describePrivate('REST PRIVATE READ', () => {
  const rest = new RestClient({
    accountAddress,
    privateKey,
  });

  it('should have credentials to test with', () => {
    expect(privateKey).toBeDefined();
  });

  describe('private POST without params', () => {
    it('should succeed calling getPerpAccountSummary', async () => {
      try {
        const res = await rest.getPerpAccountSummary();

        expect(res).toMatchObject({
          assetPositions: expect.any(Array),
          marginSummary: expect.any(Object),
          withdrawable: expect.any(String),
        });
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });

    it('should succeed calling getOpenOrders', async () => {
      try {
        const res = await rest.getOpenOrders();

        expect(Array.isArray(res)).toBe(true);
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });

    it('should succeed calling getBalances', async () => {
      try {
        const res = await rest.getBalances();

        expect(res).toMatchObject({
          perp: expect.any(Object),
          spot: expect.any(Object),
          user: expect.any(String),
        });
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });
  });

  describe('private POST with params', () => {
    it('should succeed calling getUserFillsByTime with params', async () => {
      try {
        const res = await rest.getUserFillsByTime({
          startTime: Date.now() - 60_000,
        });

        expect(Array.isArray(res)).toBe(true);
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });

    it('should succeed calling getActiveAssetData with coin', async () => {
      try {
        const res = await rest.getActiveAssetData({ coin: 'BTC' });

        expect(res).toBeDefined();
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });

    it('should succeed calling getOrderStatus with oid', async () => {
      try {
        const res = await rest.getOrderStatus({ oid: 1 });

        expect(res).toBeDefined();
      } catch (e: unknown) {
        console.log(
          `err "${expect.getState().currentTestName}"`,
          (e as { response?: unknown })?.response ?? e,
        );
        expect(e).not.toBeDefined();
      }
    });
  });
});
