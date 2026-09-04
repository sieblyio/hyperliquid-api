import { Wallet } from 'ethers';

import {
  type ExchangeResponse,
  HyperliquidApiError,
  type OrderResponseData,
  RestClient,
} from '../../../src/index.js';

// Signed Exchange writes on an empty/unfunded mainnet account. Hyperliquid has
// no GET/PUT/DELETE; the other SDKs' private POST/query/body matrix maps to:
//   - L1-signed POST with empty action (noop)
//   - L1-signed POST with action body (order / cancel)
//   - L1-signed POST with extra envelope fields (expiresAfter)
//   - user-signed EIP-712 POST with body (usd class transfer / usd send)
// A business error after the request is accepted (insufficient margin/balance,
// must deposit, order never placed) proves the signature was valid.
const privateKey = process.env.HYPERLIQUID_E2E_PRIVATE_KEY;
const accountAddress =
  process.env.HYPERLIQUID_E2E_ACCOUNT_ADDRESS ??
  (privateKey ? new Wallet(privateKey).address : undefined);
const vaultAddress = process.env.HYPERLIQUID_E2E_VAULT_ADDRESS;
const describePrivate = privateKey ? describe : describe.skip;

const SIGNATURE_FAILURE =
  /invalid signature|failed to deserialize|malformed|could not parse/i;
const UNUSED_DESTINATION = '0x0000000000000000000000000000000000000001';
const LARGE_USD_AMOUNT = '1000000';

function errorMessage(error: unknown): string {
  if (error instanceof HyperliquidApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function expectSignatureAccepted(error: unknown): void {
  const message = errorMessage(error);
  console.log(`err "${expect.getState().currentTestName}"`, {
    message,
    response: error instanceof HyperliquidApiError ? error.response : error,
  });
  expect(error).toBeInstanceOf(HyperliquidApiError);
  expect(message).not.toMatch(SIGNATURE_FAILURE);
}

function exchangeErrorText(result: ExchangeResponse): string {
  if (result.status === 'err') {
    return result.response;
  }
  const data = result.response.data as OrderResponseData | undefined;
  const statuses = data?.statuses ?? [];
  return statuses
    .map((status) => ('error' in status ? status.error : ''))
    .filter(Boolean)
    .join(' | ');
}

function expectSignedExchangeResult(result: ExchangeResponse): void {
  const text = exchangeErrorText(result);
  expect(text).not.toMatch(SIGNATURE_FAILURE);
  if (result.status === 'ok' && !text) {
    expect(result.status).toBe('ok');
    return;
  }
  expect(text.length).toBeGreaterThan(0);
}

function expectSignedBusinessFailure(result: ExchangeResponse): void {
  const text = exchangeErrorText(result);
  expect(text).not.toMatch(SIGNATURE_FAILURE);
  expect(text.length).toBeGreaterThan(0);
}

describePrivate('REST PRIVATE WRITE', () => {
  const rest = new RestClient({
    accountAddress,
    privateKey,
  });

  it('should have credentials to test with', () => {
    expect(privateKey).toBeDefined();
  });

  describe('L1 signed POST without extra params', () => {
    it('should succeed or fail invalidateNonce with empty action (validates signature)', async () => {
      try {
        const res = await rest.invalidateNonce();
        expectSignedExchangeResult(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });
  });

  describe('L1 signed POST with action body', () => {
    it('should fail submitLimitOrder with insufficient margin (validates signature)', async () => {
      try {
        const res = await rest.submitLimitOrder({
          price: '1',
          side: 'buy',
          size: '0.001',
          symbol: 'BTC',
          timeInForce: 'IOC',
        });
        expectSignedBusinessFailure(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });

    it('should fail cancelOrders for a missing order (validates signature)', async () => {
      try {
        const res = await rest.cancelOrders({
          cancels: [{ a: 'BTC', o: 1 }],
        });
        expectSignedBusinessFailure(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });
  });

  describe('L1 signed POST with extra envelope fields', () => {
    it('should succeed or fail invalidateNonce with expiresAfter (validates signature)', async () => {
      try {
        const res = await rest.invalidateNonce({
          expiresAfter: Date.now() + 30_000,
        });
        expectSignedExchangeResult(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });

    const describeVault = vaultAddress ? it : it.skip;

    describeVault(
      'should succeed or fail cancelOrders with vaultAddress envelope field (validates signature)',
      async () => {
        try {
          const res = await rest.cancelOrders(
            { cancels: [{ a: 'BTC', o: 1 }] },
            { vaultAddress: vaultAddress as string },
          );
          expectSignedBusinessFailure(res);
        } catch (e: unknown) {
          expectSignatureAccepted(e);
        }
      },
    );
  });

  describe('user-signed POST with body', () => {
    it('should fail transferUsdBetweenSpotAndPerp with insufficient balance (validates signature)', async () => {
      try {
        const res = await rest.transferUsdBetweenSpotAndPerp({
          amount: LARGE_USD_AMOUNT,
          toPerp: true,
        });
        expectSignedBusinessFailure(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });

    it('should fail sendUsd with insufficient balance (validates signature)', async () => {
      try {
        const res = await rest.sendUsd({
          amount: LARGE_USD_AMOUNT,
          destination: UNUSED_DESTINATION,
        });
        expectSignedBusinessFailure(res);
      } catch (e: unknown) {
        expectSignatureAccepted(e);
      }
    });
  });
});
