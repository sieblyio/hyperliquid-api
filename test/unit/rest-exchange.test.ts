import { Wallet } from 'ethers';

import {
  type JsonObject,
  type NonceProvider,
  RestClient,
  type RestClientOptions,
  type SubmitLimitOrderRequest,
  type SubmitOrderRequest,
} from '../../src/index.js';
import { getPartnerConfiguration } from '../../src/lib/partner-config.js';
import { USER_SIGNED_ACTIONS } from '../../src/lib/user-signed-actions.js';

interface CapturedRequest {
  body: unknown;
  path: string;
}

const PRIVATE_KEY =
  '0x0123456789012345678901234567890123456789012345678901234567890123';
const USER = '0x14791697260E4c9A71f18484C9f997B308e59325';
const OTHER_USER = '0x1111111111111111111111111111111111111111';
const BUILDER = '0x2222222222222222222222222222222222222222';
const PARTNER = {
  approvalPercentage: '0.01%',
  builder: { b: BUILDER, f: 10 },
  referralCode: 'SIEBLY',
};
const ORDER_INPUT = {
  orders: [
    {
      a: 0,
      b: true,
      p: '10',
      r: false,
      s: '1',
      t: { limit: { tif: 'Gtc' as const } },
    },
  ],
};

class CaptureRestClient extends RestClient {
  readonly requests: CapturedRequest[] = [];

  readonly testNonceProvider: TestNonceProvider;

  behavior?: (action: JsonObject) => Promise<unknown>;

  infoBehavior?: (request: JsonObject) => Promise<unknown>;

  constructor(options: RestClientOptions = {}) {
    const nonceProvider = new TestNonceProvider();
    super({ ...options, nonceProvider });
    this.testNonceProvider = nonceProvider;
  }

  get testActionBuilder() {
    return this.actionBuilder;
  }

  get testAssetResolver() {
    return this.assetResolver;
  }

  setNextNonce(nonce: number): void {
    this.testNonceProvider.setNext(nonce);
  }

  protected override async post<T>(path: string, body: unknown): Promise<T> {
    this.requests.push({ body, path });
    if (path === '/info') {
      const request = body as JsonObject;
      if (this.infoBehavior) {
        return (await this.infoBehavior(request)) as T;
      }
      if (request.type === 'maxBuilderFee') {
        return PARTNER.builder.f as T;
      }
      if (request.type === 'userRole') {
        return { role: 'user' } as T;
      }
      return {} as T;
    }

    const action = (body as { action?: JsonObject }).action;
    if (action && this.behavior) {
      return (await this.behavior(action)) as T;
    }
    return { response: { type: 'default' }, status: 'ok' } as T;
  }
}

class TestNonceProvider implements NonceProvider {
  private next = 1;

  nextNonce(): number {
    return this.next++;
  }

  setNext(nonce: number): void {
    this.next = nonce;
  }
}

function client(options: ConstructorParameters<typeof RestClient>[0] = {}) {
  const instance = new CaptureRestClient({
    accountAddress: OTHER_USER,
    privateKey: PRIVATE_KEY,
    testnet: true,
    ...options,
  });
  jest
    .spyOn(instance.testActionBuilder, 'partnerConfiguration')
    .mockReturnValue(PARTNER);
  return instance;
}

function actions(instance: CaptureRestClient): JsonObject[] {
  return instance.requests
    .map((request) => (request.body as { action?: JsonObject }).action)
    .filter((action): action is JsonObject => action !== undefined);
}

function findAction(instance: CaptureRestClient, type: string): JsonObject {
  const action = actions(instance).find((entry) => entry.type === type);
  if (!action) {
    throw new Error(`Missing captured ${type} action.`);
  }
  return action;
}

async function settleBackgroundWork(): Promise<void> {
  for (let index = 0; index < 50; index += 1) {
    await Promise.resolve();
  }
}

describe('RestClient Exchange requests', () => {
  test('loads the configured Siebly partner values', () => {
    expect(getPartnerConfiguration()).toEqual({
      approvalPercentage: '0.01%',
      builder: {
        b: '0x72f1ad41b790228c4bc4c08eb1e007bf6e4448c2',
        f: 10,
      },
      referralCode: 'SIEBLY',
    });
  });

  test('does not run a builder preflight before the missing-signer error', async () => {
    const instance = new CaptureRestClient({ testnet: true });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(instance.submitOrder(ORDER_INPUT)).rejects.toThrow(
      'requires privateKey or an external signTypedData signer',
    );
    expect(instance.requests).toHaveLength(0);
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  test('reports the missing orders array instead of an internal map error', async () => {
    const instance = client();

    await expect(
      instance.submitOrder({
        coin: 'USOL',
        px: '0',
        side: 'A',
        sz: '1',
        type: 'MKT',
      } as unknown as SubmitOrderRequest),
    ).rejects.toThrow('submitOrder requires a non-empty orders array');
    expect(instance.requests).toHaveLength(0);
  });

  test('submits a CEX-style market order as a protected IOC order', async () => {
    const instance = client();
    jest.spyOn(instance.testAssetResolver, 'resolve').mockResolvedValue({
      assetId: 10_156,
      canonicalName: '@156',
      kind: 'spot',
      szDecimals: 3,
    });
    instance.infoBehavior = async (request) => {
      if (request.type === 'allMids') {
        return { '@156': '73.1605' };
      }
      if (request.type === 'maxBuilderFee') {
        return PARTNER.builder.f;
      }
      return {};
    };

    await instance.submitMarketOrder({
      clientOrderId: '0x00000000000000000000000000000001',
      side: 'sell',
      size: '52.68231957',
      symbol: 'USOL/USDC',
    });

    expect(
      instance.requests.find(
        ({ body }) => (body as JsonObject).type === 'allMids',
      ),
    ).toEqual({ body: { type: 'allMids' }, path: '/info' });
    expect(findAction(instance, 'order')).toEqual({
      builder: PARTNER.builder,
      grouping: 'na',
      orders: [
        {
          a: 10_156,
          b: false,
          c: '0x00000000000000000000000000000001',
          p: '69.502',
          r: false,
          s: '52.682',
          t: { limit: { tif: 'Ioc' } },
        },
      ],
      type: 'order',
    });
  });

  test('loads the correct HIP-3 mids before a market order', async () => {
    const instance = client();
    jest.spyOn(instance.testAssetResolver, 'resolve').mockResolvedValue({
      assetId: 110_000,
      canonicalName: 'xyz:COIN',
      kind: 'hip3',
      szDecimals: 3,
    });
    instance.infoBehavior = async (request) => {
      if (request.type === 'allMids') {
        return { 'xyz:COIN': '2' };
      }
      if (request.type === 'maxBuilderFee') {
        return PARTNER.builder.f;
      }
      return {};
    };

    await instance.submitMarketOrder({
      maxSlippage: 0.1,
      side: 'buy',
      size: '1.2345',
      symbol: 'xyz:COIN',
    });

    expect(
      instance.requests.find(
        ({ body }) => (body as JsonObject).type === 'allMids',
      ),
    ).toEqual({
      body: { dex: 'xyz', type: 'allMids' },
      path: '/info',
    });
    expect(findAction(instance, 'order')).toMatchObject({
      orders: [
        {
          a: 110_000,
          b: true,
          p: '2.2',
          s: '1.234',
          t: { limit: { tif: 'Ioc' } },
        },
      ],
    });
  });

  test('submits CEX-style limit and post-only orders', async () => {
    const instance = client();
    jest.spyOn(instance.testAssetResolver, 'resolve').mockResolvedValue({
      assetId: 0,
      canonicalName: 'BTC',
      kind: 'perp',
      szDecimals: 5,
    });

    await instance.submitLimitOrder({
      price: '100.00',
      side: 'buy',
      size: '1.2500',
      symbol: 'BTC',
    });
    expect(findAction(instance, 'order')).toMatchObject({
      orders: [
        {
          a: 0,
          b: true,
          p: '100',
          r: false,
          s: '1.25',
          t: { limit: { tif: 'Gtc' } },
        },
      ],
    });

    await instance.submitLimitOrder({
      postOnly: true,
      price: '101',
      reduceOnly: true,
      side: 'sell',
      size: '2',
      symbol: 'BTC',
    });
    expect(
      actions(instance)
        .filter((action) => action.type === 'order')
        .at(-1),
    ).toMatchObject({
      orders: [
        {
          b: false,
          p: '101',
          r: true,
          s: '2',
          t: { limit: { tif: 'Alo' } },
        },
      ],
    });
  });

  test('validates CEX-style order inputs before signing', async () => {
    const instance = client();

    await expect(
      instance.submitLimitOrder({
        postOnly: true,
        price: '10',
        side: 'buy',
        size: '1',
        symbol: 'BTC',
        timeInForce: 'IOC',
      }),
    ).rejects.toThrow('postOnly cannot be combined');
    await expect(
      instance.submitLimitOrder({
        price: '0',
        side: 'buy',
        size: '1',
        symbol: 'BTC',
      }),
    ).rejects.toThrow('price must be greater than zero');
    await expect(
      instance.submitLimitOrder({
        price: '10',
        side: 'buy',
        size: '1',
        symbol: 'BTC',
        timeInForce: 'FOK',
      } as unknown as SubmitLimitOrderRequest),
    ).rejects.toThrow('timeInForce must be "GTC" or "IOC"');
    await expect(
      instance.submitLimitOrder({
        price: '10',
        side: 'buy',
        size: 1,
        symbol: 'BTC',
      } as unknown as SubmitLimitOrderRequest),
    ).rejects.toThrow('Invalid decimal string "1"');

    jest.spyOn(instance.testAssetResolver, 'resolve').mockResolvedValue({
      assetId: 0,
      canonicalName: 'BTC',
      kind: 'perp',
      szDecimals: 5,
    });
    instance.infoBehavior = async () => ({ BTC: '100' });
    await expect(
      instance.submitMarketOrder({
        maxSlippage: 1,
        side: 'buy',
        size: '1',
        symbol: 'BTC',
      }),
    ).rejects.toThrow('maxSlippage must be at least 0 and less than 1');
    expect(instance.requests).toHaveLength(0);
  });

  test('builds all typed trading actions with canonical asset IDs', async () => {
    const instance = client();
    instance.setNextNonce(1_000);
    const commonOrder = {
      a: 0,
      b: true,
      p: '100.00',
      r: false,
      s: '1.2500',
      t: { limit: { tif: 'Gtc' as const } },
    };

    await instance.submitOrder(
      { orders: [commonOrder], grouping: 'na' },
      { expiresAfter: 2_000, vaultAddress: OTHER_USER },
    );
    const order = findAction(instance, 'order');
    expect(order).toEqual({
      type: 'order',
      orders: [
        {
          a: 0,
          b: true,
          p: '100',
          s: '1.25',
          r: false,
          t: { limit: { tif: 'Gtc' } },
        },
      ],
      grouping: 'na',
      builder: PARTNER.builder,
    });
    const orderEnvelope = instance.requests.find(
      (request) =>
        (request.body as { action?: JsonObject }).action?.type === 'order',
    )?.body as Record<string, unknown>;
    expect(orderEnvelope).toMatchObject({
      expiresAfter: 2_000,
      vaultAddress: OTHER_USER,
    });

    await instance.modifyOrder({
      oid: 1,
      order: commonOrder,
      alwaysPlace: true,
    });
    expect(findAction(instance, 'modify')).toMatchObject({
      oid: 1,
      order: { a: 0, p: '100', s: '1.25' },
      a: true,
    });

    await instance.modifyOrders({
      modifies: [{ oid: '0x01', order: commonOrder }],
      alwaysPlace: true,
    });
    expect(findAction(instance, 'batchModify')).toMatchObject({
      modifies: [{ oid: '0x01', order: { a: 0 } }],
      a: true,
    });

    await instance.cancelOrders({
      cancels: [{ a: 0, o: 4 }],
      fastCancel: true,
    });
    expect(findAction(instance, 'cancel')).toEqual({
      type: 'cancel',
      cancels: [{ a: 0, o: 4 }],
      f: true,
    });

    await instance.cancelOrdersByClientOrderId({
      cancels: [{ asset: 10_107, cloid: '0x00000000000000000000000000000001' }],
      fastCancel: true,
    });
    expect(findAction(instance, 'cancelByCloid')).toEqual({
      type: 'cancelByCloid',
      cancels: [
        {
          asset: 10_107,
          cloid: '0x00000000000000000000000000000001',
        },
      ],
      f: true,
    });

    await instance.updateLeverage({ asset: 0, isCross: true, leverage: 3 });
    await instance.updateIsolatedMargin({ asset: 0, isBuy: true, ntli: 2 });
    await instance.setIsolatedMarginLeverage({ asset: 0, leverage: '2.500' });
    await instance.submitTwapOrder({
      a: 0,
      b: true,
      m: 5,
      r: false,
      s: '1.500',
      t: true,
    });
    await instance.cancelTwapOrder({ a: 0, t: 7 });
    await instance.setCancelAllAfter({ time: 4_000 });

    expect(findAction(instance, 'updateLeverage')).toEqual({
      type: 'updateLeverage',
      asset: 0,
      isCross: true,
      leverage: 3,
    });
    expect(findAction(instance, 'updateIsolatedMargin')).toEqual({
      type: 'updateIsolatedMargin',
      asset: 0,
      isBuy: true,
      ntli: 2,
    });
    expect(findAction(instance, 'topUpIsolatedOnlyMargin')).toEqual({
      type: 'topUpIsolatedOnlyMargin',
      asset: 0,
      leverage: '2.5',
    });
    expect(findAction(instance, 'twapOrder')).toEqual({
      type: 'twapOrder',
      twap: { a: 0, b: true, s: '1.5', r: false, m: 5, t: true },
    });
    expect(findAction(instance, 'twapCancel')).toEqual({
      type: 'twapCancel',
      a: 0,
      t: 7,
    });
    expect(findAction(instance, 'scheduleCancel')).toEqual({
      type: 'scheduleCancel',
      time: 4_000,
    });
  });

  test('builds every user-signed action and applies wire transformations', async () => {
    const instance = client();
    let nonce = 2_000;
    const check = async (
      run: (value: number) => Promise<unknown>,
      type: string,
      expected: Record<string, unknown> = {},
    ): Promise<void> => {
      const value = nonce++;
      instance.setNextNonce(value);
      await run(value);
      expect(findAction(instance, type)).toMatchObject({
        type,
        hyperliquidChain: 'Testnet',
        signatureChainId: '0x66eee',
        ...expected,
      });
    };

    await check((_value) => instance.approveBuilderFee(), 'approveBuilderFee', {
      builder: BUILDER,
      maxFeeRate: '0.01%',
    });
    await check(
      (_value) =>
        instance.approveApiWallet({ agentAddress: USER, agentName: null }),
      'approveAgent',
      { agentAddress: USER.toLowerCase(), agentName: '' },
    );
    await check(
      (_value) => instance.sendUsd({ amount: '1.2300', destination: USER }),
      'usdSend',
      { amount: '1.23', destination: USER.toLowerCase(), time: 2_002 },
    );
    await check(
      (_value) =>
        instance.sendSpotAsset({
          amount: '2.00',
          destination: USER,
          token: 'PURR:0x01',
        }),
      'spotSend',
      { amount: '2', destination: USER.toLowerCase(), token: 'PURR:0x01' },
    );
    await check(
      (_value) => instance.withdrawUsd({ amount: '3.00', destination: USER }),
      'withdraw3',
      { amount: '3', destination: USER.toLowerCase() },
    );
    await check(
      (_value) =>
        instance.transferUsdBetweenSpotAndPerp({
          amount: `4.500 subaccount:${USER}`,
          toPerp: true,
        }),
      'usdClassTransfer',
      {
        amount: `4.5 subaccount:${USER.toLowerCase()}`,
        toPerp: true,
      },
    );
    await check(
      (_value) =>
        instance.sendAsset({
          amount: '5.00',
          destination: USER,
          destinationDex: 'xyz',
          sourceDex: '',
          token: 'USDC',
        }),
      'sendAsset',
      {
        amount: '5',
        destination: USER.toLowerCase(),
        fromSubAccount: '',
      },
    );
    await check(
      (_value) =>
        instance.sendToEvmWithData({
          addressEncoding: 'hex',
          amount: '6.0',
          data: '0x',
          destinationChainId: 1,
          destinationRecipient: USER,
          gasLimit: 100_000,
          sourceDex: '',
          token: 'USDC',
        }),
      'sendToEvmWithData',
      { amount: '6', destinationRecipient: USER.toLowerCase() },
    );
    await check(
      (_value) => instance.depositIntoStaking({ wei: 7 }),
      'cDeposit',
      { wei: 7 },
    );
    await check(
      (_value) => instance.withdrawFromStaking({ wei: 8 }),
      'cWithdraw',
      { wei: 8 },
    );
    await check(
      (_value) =>
        instance.delegateOrUndelegateStake({
          isUndelegate: false,
          validator: USER,
          wei: 9,
        }),
      'tokenDelegate',
      { validator: USER.toLowerCase() },
    );
    await check(
      (_value) =>
        instance.convertToMultiSigUser({
          signers: { authorizedUsers: [USER], threshold: 1 },
        }),
      'convertToMultiSigUser',
      {
        signers: JSON.stringify({
          authorizedUsers: [USER.toLowerCase()],
          threshold: 1,
        }),
      },
    );
    await check(
      (_value) =>
        instance.linkStakingAccount({ isFinalize: false, user: USER }),
      'linkStakingUser',
      { user: USER.toLowerCase() },
    );
    await check(
      (_value) => instance.disableStakingTradingLink({ tradingUser: USER }),
      'stakingLinkDisableTradingUser',
      { tradingUser: USER.toLowerCase() },
    );
    await check(
      (_value) =>
        instance.setUserPortfolioMargin({ enabled: true, user: USER }),
      'userPortfolioMargin',
      { enabled: true, user: USER.toLowerCase() },
    );
    await check(
      (_value) =>
        instance.setUserAbstraction({
          abstraction: 'unifiedAccount',
          user: USER,
        }),
      'userSetAbstraction',
      { abstraction: 'unifiedAccount', user: USER.toLowerCase() },
    );
    await check(
      (_value) => instance.setUserDexAbstraction({ enabled: true, user: USER }),
      'userDexAbstraction',
      { enabled: true, user: USER.toLowerCase() },
    );
  });

  test('builds every advanced L1 action', async () => {
    const instance = client();
    let nonce = 3_000;
    const check = async (
      type: string,
      run: (value: number) => Promise<unknown>,
      expected: Record<string, unknown> = {},
    ): Promise<void> => {
      const value = nonce++;
      instance.setNextNonce(value);
      await run(value);
      expect(findAction(instance, type)).toMatchObject({ type, ...expected });
    };

    await check('setReferrer', (_value) => instance.setReferrer());
    await check('registerReferrer', (_value) =>
      instance.registerReferrer({ code: 'MINE' }),
    );
    await check('agentSendAsset', (_value) =>
      instance.sendAssetFromApiWallet({
        amount: '1.200',
        destination: USER,
        destinationDex: 'xyz',
        sourceDex: '',
        token: 'USDC',
      }),
    );
    await check('agentEnableDexAbstraction', (_value) =>
      instance.enableApiWalletDexAbstraction(),
    );
    await check('agentSetAbstraction', (_value) =>
      instance.setApiWalletAbstraction({ abstraction: 'u' }),
    );
    await check('borrowLend', (_value) =>
      instance.executeBorrowLendOperation({
        amount: '2.500',
        operation: 'supply',
        token: 0,
      }),
    );
    await check('claimRewards', (_value) => instance.claimRewards());
    await check('createSubAccount', (_value) =>
      instance.createSubAccount({ name: 'Desk' }),
    );
    await check('createVault', (_value) =>
      instance.createVault({
        description: 'Vault',
        initialUsd: 10,
        name: 'Desk',
      }),
    );
    await check('evmUserModify', (_value) =>
      instance.setEvmBigBlocks({ usingBigBlocks: true }),
    );
    await check('finalizeEvmContract', (_value) =>
      instance.finalizeEvmContract({ input: 'firstStorageSlot', token: 1 }),
    );
    await check('gossipPriorityBid', (_value) =>
      instance.submitGossipPriorityBid({
        ip: '127.0.0.1',
        maxGas: 1,
        slotId: 0,
      }),
    );
    await check('hip3LiquidatorTransfer', (_value) =>
      instance.transferHip3LiquidatorFunds({
        dex: 'xyz',
        isDeposit: true,
        ntl: 2,
      }),
    );
    await check('noop', (_value) => instance.invalidateNonce());
    await check('perpDeploy', (_value) =>
      instance.deployPerp({ setFeeScale: { dex: 'xyz', scale: 1 } }),
    );
    await check('spotDeploy', (_value) =>
      instance.deploySpot({ enableQuoteToken: { token: 1 } }),
    );
    await check('reserveRequestWeight', (_value) =>
      instance.reserveAdditionalActions({ weight: 1 }),
    );
    await check('setDisplayName', (_value) =>
      instance.setDisplayName({ displayName: 'Desk' }),
    );
    await check('spotUser', (_value) =>
      instance.setSpotDusting({ toggleSpotDusting: { optOut: false } }),
    );
    await check('subAccountModify', (_value) =>
      instance.renameSubAccount({ name: 'Desk', subAccountUser: USER }),
    );
    await check('subAccountSpotTransfer', (_value) =>
      instance.transferSpotToOrFromSubAccount({
        amount: '1.200',
        isDeposit: true,
        subAccountUser: USER,
        token: 'USDC',
      }),
    );
    await check('subAccountTransfer', (_value) =>
      instance.transferUsdToOrFromSubAccount({
        isDeposit: true,
        subAccountUser: USER,
        usd: 1,
      }),
    );
    await check('vaultTransfer', (_value) =>
      instance.transferVaultFunds({
        isDeposit: true,
        usd: 1,
        vaultAddress: USER,
      }),
    );
    await check('vaultDistribute', (_value) =>
      instance.distributeVaultFunds({ usd: 1, vaultAddress: USER }),
    );
    await check('vaultModify', (_value) =>
      instance.modifyVault({ allowDeposits: true, vaultAddress: USER }),
    );
    await check('validatorL1Stream', (_value) =>
      instance.updateValidatorL1Stream({ riskFreeRate: '0.0500' }),
    );
    await check('CSignerAction', (_value) =>
      instance.submitSignerAction({ unjailSelf: null }),
    );
    await check('CValidatorAction', (_value) =>
      instance.submitValidatorAction({ changeProfile: { name: 'Validator' } }),
    );
    await check('authorizeAqav2Role', (_value) =>
      instance.authorizeAqav2Role({ role: 'technical', token: 1 }),
    );
    await check('userOutcome', (_value) =>
      instance.submitUserOutcome({
        splitOutcome: { amount: '1.500', outcome: 10 },
      }),
    );

    expect(findAction(instance, 'setReferrer')).toMatchObject({
      code: 'SIEBLY',
    });
    expect(findAction(instance, 'agentSendAsset')).toMatchObject({
      amount: '1.2',
      destination: USER.toLowerCase(),
      fromSubAccount: '',
    });
    expect(findAction(instance, 'borrowLend')).toMatchObject({ amount: '2.5' });
    expect(findAction(instance, 'createVault')).toMatchObject({
      nonce: expect.any(Number),
    });
    expect(findAction(instance, 'subAccountSpotTransfer')).toMatchObject({
      amount: '1.2',
      subAccountUser: USER.toLowerCase(),
    });
    expect(findAction(instance, 'vaultModify')).toMatchObject({
      allowDeposits: true,
      alwaysCloseOnWithdraw: null,
      vaultAddress: USER.toLowerCase(),
    });
    expect(findAction(instance, 'validatorL1Stream')).toMatchObject({
      riskFreeRate: '0.05',
    });
    expect(findAction(instance, 'userOutcome')).toMatchObject({
      splitOutcome: { amount: '1.5', outcome: 10 },
    });
  });

  test('keeps referral passive and approves a private-key master in the background', async () => {
    const instance = client({ accountAddress: USER });
    instance.infoBehavior = async (request) =>
      request.type === 'maxBuilderFee' ? 0 : {};
    let releaseReferral: (() => void) | undefined;
    const referralPending = new Promise<void>((resolve) => {
      releaseReferral = resolve;
    });
    let releaseApproval: (() => void) | undefined;
    let markApprovalStarted: (() => void) | undefined;
    const approvalPending = new Promise<void>((resolve) => {
      releaseApproval = resolve;
    });
    const approvalStarted = new Promise<void>((resolve) => {
      markApprovalStarted = resolve;
    });
    instance.behavior = async (action) => {
      if (action.type === 'approveBuilderFee') {
        markApprovalStarted?.();
        await approvalPending;
      }
      if (action.type === 'setReferrer') {
        await referralPending;
        return { response: { type: 'default' }, status: 'ok' };
      }
      return { response: { type: 'default' }, status: 'ok' };
    };

    await expect(instance.submitOrder(ORDER_INPUT)).resolves.toMatchObject({
      status: 'ok',
    });
    expect(instance.requests[0]).toEqual({
      body: {
        builder: BUILDER,
        type: 'maxBuilderFee',
        user: USER.toLowerCase(),
      },
      path: '/info',
    });
    expect(findAction(instance, 'order')).not.toHaveProperty('builder');
    await approvalStarted;
    expect(
      actions(instance).filter((action) => action.type === 'order'),
    ).toHaveLength(1);

    releaseApproval?.();
    await settleBackgroundWork();
    await expect(instance.submitOrder(ORDER_INPUT)).resolves.toMatchObject({
      status: 'ok',
    });

    expect(
      actions(instance).filter((action) => action.type === 'approveBuilderFee'),
    ).toHaveLength(1);
    expect(
      actions(instance).filter((action) => action.type === 'setReferrer'),
    ).toHaveLength(1);
    expect(
      actions(instance).filter((action) => action.type === 'order'),
    ).toHaveLength(2);
    expect(
      actions(instance).filter((entry) => entry.type === 'order')[1],
    ).toMatchObject({ builder: PARTNER.builder });

    releaseReferral?.();
  });

  test('checks a configured API wallet owner once and tags its first order', async () => {
    const instance = client({ accountAddress: OTHER_USER });
    await instance.submitOrder(ORDER_INPUT);
    expect(findAction(instance, 'order')).toMatchObject({
      builder: PARTNER.builder,
    });
    await instance.submitOrder(ORDER_INPUT);

    expect(
      actions(instance).filter((action) => action.type === 'approveBuilderFee'),
    ).toHaveLength(0);
    expect(
      actions(instance).filter((action) => action.type === 'order')[1],
    ).toMatchObject({ builder: PARTNER.builder });
    expect(
      instance.requests.filter(
        (request) =>
          request.path === '/info' &&
          (request.body as JsonObject).type === 'maxBuilderFee',
      ),
    ).toHaveLength(1);
  });

  test('coalesces the preflight check across concurrent first orders', async () => {
    const instance = client({ accountAddress: OTHER_USER });
    let releaseCheck: ((fee: number) => void) | undefined;
    const checkPending = new Promise<number>((resolve) => {
      releaseCheck = resolve;
    });
    instance.infoBehavior = async (request) => {
      return request.type === 'maxBuilderFee' ? checkPending : {};
    };

    const first = instance.submitOrder(ORDER_INPUT);
    const second = instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();
    expect(
      actions(instance).filter((action) => action.type === 'order'),
    ).toHaveLength(0);
    expect(
      instance.requests.filter(
        (request) =>
          request.path === '/info' &&
          (request.body as JsonObject).type === 'maxBuilderFee',
      ),
    ).toHaveLength(1);

    releaseCheck?.(PARTNER.builder.f);
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(
      actions(instance).filter((action) => action.type === 'order'),
    ).toEqual([
      expect.objectContaining({ builder: PARTNER.builder }),
      expect.objectContaining({ builder: PARTNER.builder }),
    ]);
  });

  test('falls through untagged when the preflight exceeds its budget', async () => {
    jest.useFakeTimers();
    const instance = client({ accountAddress: OTHER_USER });
    instance.infoBehavior = async (request) =>
      request.type === 'maxBuilderFee'
        ? new Promise<number>(() => undefined)
        : {};

    const pending = instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();
    expect(
      actions(instance).filter((action) => action.type === 'order'),
    ).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toMatchObject({ status: 'ok' });
    expect(findAction(instance, 'order')).not.toHaveProperty('builder');

    await expect(instance.submitOrder(ORDER_INPUT)).resolves.toMatchObject({
      status: 'ok',
    });
    expect(
      actions(instance)
        .filter((action) => action.type === 'order')
        .every((action) => action.builder === undefined),
    ).toBe(true);
    expect(
      instance.requests.filter(
        (request) =>
          request.path === '/info' &&
          (request.body as JsonObject).type === 'maxBuilderFee',
      ),
    ).toHaveLength(1);
    jest.useRealTimers();
  });

  test('discovers an agent owner and warns on every unapproved order', async () => {
    const instance = client({ accountAddress: undefined });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    instance.infoBehavior = async (request) => {
      if (request.type === 'userRole') {
        return { role: 'agent', data: { user: OTHER_USER.toUpperCase() } };
      }
      return request.type === 'maxBuilderFee' ? 0 : {};
    };

    await instance.submitOrder(ORDER_INPUT);
    expect(findAction(instance, 'order')).not.toHaveProperty('builder');
    await settleBackgroundWork();
    await instance.submitOrder(ORDER_INPUT);
    await instance.submitOrder(ORDER_INPUT);

    expect(
      instance.requests
        .filter((request) => request.path === '/info')
        .map((request) => request.body),
    ).toEqual([
      {
        type: 'userRole',
        user: USER.toLowerCase(),
      },
      {
        type: 'maxBuilderFee',
        user: OTHER_USER,
        builder: BUILDER,
      },
    ]);
    expect(
      actions(instance)
        .filter((action) => action.type === 'order')
        .every((action) => action.builder === undefined),
    ).toBe(true);
    expect(
      actions(instance).filter((action) => action.type === 'approveBuilderFee'),
    ).toHaveLength(0);
    expect(warning).toHaveBeenCalledTimes(3);
    expect(warning).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'A future major version may require approval before trading.',
      ),
    );
    warning.mockRestore();
  });

  test('does not prompt an external master signer automatically', async () => {
    const instance = new CaptureRestClient({
      signer: new Wallet(PRIVATE_KEY),
      testnet: true,
    });
    jest
      .spyOn(instance.testActionBuilder, 'partnerConfiguration')
      .mockReturnValue(PARTNER);
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    instance.infoBehavior = async (request) => {
      if (request.type === 'userRole') {
        return { role: 'user' };
      }
      return request.type === 'maxBuilderFee' ? 0 : {};
    };

    await instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();

    expect(
      actions(instance).filter((action) => action.type === 'approveBuilderFee'),
    ).toHaveLength(0);
    expect(warning).toHaveBeenCalledTimes(1);

    await instance.approveBuilderFee();
    await instance.submitOrder(ORDER_INPUT);
    expect(
      actions(instance).filter((action) => action.type === 'order')[1],
    ).toMatchObject({ builder: PARTNER.builder });
    warning.mockRestore();
  });

  test('omits the builder and warns when approval cannot be checked', async () => {
    const instance = client({ accountAddress: OTHER_USER });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    instance.infoBehavior = async (request) => {
      if (request.type === 'maxBuilderFee') {
        throw new Error('Info unavailable');
      }
      return {};
    };

    await instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();
    await instance.submitOrder(ORDER_INPUT);

    expect(
      actions(instance)
        .filter((action) => action.type === 'order')
        .every((action) => action.builder === undefined),
    ).toBe(true);
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('approval could not be verified'),
    );
    warning.mockRestore();
  });

  test('does not let a broken warning logger block an order', async () => {
    const instance = client({ accountAddress: OTHER_USER });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('logger failed');
    });
    instance.infoBehavior = async (request) =>
      request.type === 'maxBuilderFee' ? 0 : {};

    await instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();
    await expect(instance.submitOrder(ORDER_INPUT)).resolves.toMatchObject({
      status: 'ok',
    });
    expect(warning).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });

  test('swallows a failed background referral attempt', async () => {
    const instance = client();
    instance.behavior = async (action) => {
      if (action.type === 'setReferrer') {
        throw new Error('referral unavailable');
      }
      return { response: { type: 'default' }, status: 'ok' };
    };

    await expect(
      instance.cancelOrders({ cancels: [{ a: 0, o: 1 }] }),
    ).resolves.toMatchObject({ status: 'ok' });
    await settleBackgroundWork();
    expect(
      actions(instance).filter((action) => action.type === 'setReferrer'),
    ).toHaveLength(1);
  });

  test('does not repeat a manually attempted referral on a later trade', async () => {
    const instance = client();

    await instance.setReferrer();
    await instance.submitOrder(ORDER_INPUT);
    await settleBackgroundWork();

    expect(
      actions(instance).filter((action) => action.type === 'setReferrer'),
    ).toEqual([
      expect.objectContaining({
        code: 'SIEBLY',
        type: 'setReferrer',
      }),
    ]);
  });

  test('raw actions strip or replace builders based on the preflight result', async () => {
    const instance = client();
    const rawOrder = {
      type: 'order',
      orders: [
        {
          a: 0,
          b: true,
          p: '1.00',
          s: '2.00',
          r: false,
          t: { limit: { tif: 'Gtc' } },
        },
      ],
      builder: { b: OTHER_USER, f: 0 },
    };
    await instance.submitRawL1Action(rawOrder, { nonce: 6_000 });
    expect(findAction(instance, 'order')).toMatchObject({
      builder: PARTNER.builder,
    });

    const unapproved = client();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    unapproved.infoBehavior = async (request) =>
      request.type === 'maxBuilderFee' ? 0 : {};
    await unapproved.submitRawL1Action(rawOrder, { nonce: 6_001 });
    expect(findAction(unapproved, 'order')).not.toHaveProperty('builder');
    warning.mockRestore();
  });

  test('multisig actions keep the shared canonical signing path', async () => {
    const instance = client();

    const signer = instance.testActionBuilder;
    const wallet = Wallet.fromPhrase(
      'test test test test test test test test test test test junk',
    );
    await instance.submitMultiSigL1Action(
      { type: 'noop' },
      {
        multiSigUser: OTHER_USER,
        nonce: 6_100,
        signers: [new Wallet(PRIVATE_KEY), wallet],
      },
    );
    const multiSig = findAction(instance, 'multiSig');
    expect(multiSig.signatureChainId).toBe('0x66eee');
    expect(multiSig.signatures).toHaveLength(2);
    expect(signer).toBe(instance.testActionBuilder);

    await instance.submitMultiSigUserSignedAction(
      {
        time: 0,
        amount: '1',
        destination: USER,
        hyperliquidChain: 'Wrong',
        signatureChainId: '0x1',
        type: 'usdSend',
      },
      USER_SIGNED_ACTIONS.usdSend,
      {
        multiSigUser: OTHER_USER,
        nonce: 6_101,
        signers: [new Wallet(PRIVATE_KEY), wallet],
      },
    );
    expect(
      actions(instance).filter((action) => action.type === 'multiSig'),
    ).toHaveLength(2);
    const userSignedMultiSig = actions(instance).filter(
      (action) => action.type === 'multiSig',
    )[1];
    const payload = userSignedMultiSig?.payload as {
      action: Record<string, unknown>;
    };
    expect(Object.keys(payload.action)).toEqual([
      'type',
      'signatureChainId',
      'hyperliquidChain',
      'destination',
      'amount',
      'time',
    ]);
    expect(payload.action).toMatchObject({
      destination: USER.toLowerCase(),
      hyperliquidChain: 'Testnet',
      signatureChainId: '0x66eee',
      time: 6_101,
    });
  });

  test('checks multisig approval before signing without automatic approval', async () => {
    const instance = new CaptureRestClient({ testnet: true });
    jest
      .spyOn(instance.testActionBuilder, 'partnerConfiguration')
      .mockReturnValue(PARTNER);
    const signers = [
      new Wallet(PRIVATE_KEY),
      Wallet.fromPhrase(
        'test test test test test test test test test test test junk',
      ),
    ] as const;

    await expect(
      instance.submitMultiSigL1Action(
        {
          type: 'order',
          orders: [
            {
              a: 0,
              b: true,
              p: '1',
              r: false,
              s: '1',
              t: { limit: { tif: 'Gtc' } },
            },
          ],
        },
        {
          multiSigUser: OTHER_USER,
          nonce: 7_000,
          signers,
        },
      ),
    ).resolves.toMatchObject({ status: 'ok' });
    await settleBackgroundWork();

    await expect(
      instance.submitMultiSigL1Action(
        {
          type: 'order',
          orders: [
            {
              a: 0,
              b: false,
              p: '2',
              r: false,
              s: '1',
              t: { limit: { tif: 'Gtc' } },
            },
          ],
        },
        {
          multiSigUser: OTHER_USER,
          nonce: 7_001,
          signers,
        },
      ),
    ).resolves.toMatchObject({ status: 'ok' });

    const innerTypes = actions(instance)
      .filter((action) => action.type === 'multiSig')
      .map(
        (action) =>
          (
            action.payload as {
              action: { builder?: unknown; type: string };
            }
          ).action,
      );
    expect(
      innerTypes.filter((action) => action.type === 'approveBuilderFee'),
    ).toHaveLength(0);
    expect(
      innerTypes.filter((action) => action.type === 'setReferrer'),
    ).toHaveLength(1);
    expect(innerTypes.filter((action) => action.type === 'order')).toEqual([
      expect.objectContaining({ builder: PARTNER.builder }),
      expect.objectContaining({ builder: PARTNER.builder }),
    ]);
  });
});
