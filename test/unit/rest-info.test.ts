import { type HyperliquidSigner, RestClient } from '../../src/index.js';

interface CapturedRequest {
  body: unknown;
  path: string;
}

class CaptureRestClient extends RestClient {
  readonly requests: CapturedRequest[] = [];

  responseFor?: (body: Record<string, unknown>) => unknown;

  get testAssetResolver() {
    return this.assetResolver;
  }

  protected override async post<T>(path: string, body: unknown): Promise<T> {
    this.requests.push({
      body,
      path,
    });
    return (this.responseFor?.(body as Record<string, unknown>) ?? {}) as T;
  }
}

const USER = '0x14791697260E4c9A71f18484C9f997B308e59325';
const LOWER_USER = USER.toLowerCase();
const AGENT = '0x1111111111111111111111111111111111111111';
const OTHER_ACCOUNT = '0x2222222222222222222222222222222222222222';

const signer: HyperliquidSigner = {
  address: AGENT,
  signTypedData: async () => `0x${'00'.repeat(65)}`,
};

describe('RestClient Info requests', () => {
  const noParameterMethods = [
    ['getAllBorrowLendReserveStates', 'allBorrowLendReserveStates'],
    ['getAllPerpMetadata', 'allPerpMetas'],
    ['getExchangeStatus', 'exchangeStatus'],
    ['getGossipPriorityAuctionStatus', 'gossipPriorityAuctionStatus'],
    ['getGossipRootIps', 'gossipRootIps'],
    ['getLiquidatablePositions', 'liquidatable'],
    ['getMaxMarketOrderNotionals', 'maxMarketOrderNtls'],
    ['getOutcomeMetadata', 'outcomeMeta'],
    ['getPerpCategories', 'perpCategories'],
    ['getConcisePerpAnnotations', 'perpConciseAnnotations'],
    ['getPerpDeployAuctionStatus', 'perpDeployAuctionStatus'],
    ['getPerpDexs', 'perpDexs'],
    ['getPredictedFundingRates', 'predictedFundings'],
    ['getSpotMetadata', 'spotMeta'],
    ['getSpotAssetContexts', 'spotMetaAndAssetCtxs'],
    ['getSpotPairDeployAuctionStatus', 'spotPairDeployAuctionStatus'],
    ['getValidatorL1Votes', 'validatorL1Votes'],
    ['getValidatorSummaries', 'validatorSummaries'],
    ['getVaultSummaries', 'vaultSummaries'],
  ] as const;

  test.each(noParameterMethods)(
    '%s builds its documented request',
    async (method, wireType) => {
      const client = new CaptureRestClient();
      await (client[method] as () => Promise<unknown>)();
      expect(client.requests).toEqual([
        { body: { type: wireType }, path: '/info' },
      ]);
    },
  );

  const userMethods = [
    ['getApprovedBuilders', 'approvedBuilders'],
    ['getUserBorrowLendState', 'borrowLendUserState'],
    ['getStakingDelegations', 'delegations'],
    ['getStakingHistory', 'delegatorHistory'],
    ['getStakingRewards', 'delegatorRewards'],
    ['getStakingSummary', 'delegatorSummary'],
    ['getExtraAgents', 'extraAgents'],
    ['getOrderHistory', 'historicalOrders'],
    ['getVipStatus', 'isVip'],
    ['getLeadingVaults', 'leadingVaults'],
    ['getLegalStatus', 'legalCheck'],
    ['getPortfolio', 'portfolio'],
    ['getReferralInfo', 'referral'],
    ['getSpotBalances', 'spotClearinghouseState'],
    ['getSpotDeployAuctionStatus', 'spotDeployState'],
    ['getSubAccounts', 'subAccounts'],
    ['getTwapHistory', 'twapHistory'],
    ['getUserAbstraction', 'userAbstraction'],
    ['getUserDexAbstraction', 'userDexAbstraction'],
    ['getUserFees', 'userFees'],
    ['getUserRateLimit', 'userRateLimit'],
    ['getUserRole', 'userRole'],
    ['getMultiSigSigners', 'userToMultiSigSigners'],
    ['getUserTwapSliceFills', 'userTwapSliceFills'],
    ['getUserVaultDeposits', 'userVaultEquities'],
    ['getWebData2', 'webData2'],
  ] as const;

  test.each(userMethods)(
    '%s builds and normalizes its user request',
    async (method, wireType) => {
      const client = new CaptureRestClient();
      const callable = client[method] as (params: {
        user: string;
      }) => Promise<unknown>;
      await callable.call(client, { user: USER });
      expect(client.requests).toEqual([
        { body: { type: wireType, user: LOWER_USER }, path: '/info' },
      ]);
    },
  );

  test('builds every parameterized Info request with the documented shape', async () => {
    const client = new CaptureRestClient();
    jest
      .spyOn(client.testAssetResolver, 'nameToCoin')
      .mockImplementation(async (name) => name);
    const check = async (
      run: () => Promise<unknown>,
      expected: Record<string, unknown>,
    ): Promise<void> => {
      client.requests.length = 0;
      await run();
      expect(client.requests).toEqual([{ body: expected, path: '/info' }]);
    };

    await check(() => client.getAllMids({ dex: 'xyz' }), {
      type: 'allMids',
      dex: 'xyz',
    });
    await check(() => client.getActiveAssetData({ user: USER, coin: 'BTC' }), {
      type: 'activeAssetData',
      user: LOWER_USER,
      coin: 'BTC',
    });
    await check(() => client.getBorrowLendReserveState({ token: 1 }), {
      type: 'borrowLendReserveState',
      token: 1,
    });
    await check(
      () =>
        client.getCandles({
          coin: 'BTC',
          interval: '1m',
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'candleSnapshot',
        req: {
          coin: 'BTC',
          interval: '1m',
          startTime: 10,
          endTime: 20,
        },
      },
    );
    await check(
      () => client.getPerpAccountSummary({ user: USER, dex: 'xyz' }),
      {
        type: 'clearinghouseState',
        user: LOWER_USER,
        dex: 'xyz',
      },
    );
    await check(
      () => client.getFrontendOpenOrders({ user: USER, dex: 'xyz' }),
      {
        type: 'frontendOpenOrders',
        user: LOWER_USER,
        dex: 'xyz',
      },
    );
    await check(
      () =>
        client.getFundingHistory({ coin: 'BTC', startTime: 10, endTime: 20 }),
      {
        type: 'fundingHistory',
        coin: 'BTC',
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () => client.getOrderBook({ coin: 'BTC', nSigFigs: 5, mantissa: 2 }),
      {
        type: 'l2Book',
        coin: 'BTC',
        nSigFigs: 5,
        mantissa: 2,
      },
    );
    await check(
      () =>
        client.getOrderBook({ coin: 'BTC', nSigFigs: null, mantissa: null }),
      {
        type: 'l2Book',
        coin: 'BTC',
        nSigFigs: null,
        mantissa: null,
      },
    );
    await check(() => client.getMarginTable({ id: 4 }), {
      type: 'marginTable',
      id: 4,
    });
    await check(
      () =>
        client.getMaxBuilderFee({
          user: USER,
          builder: '0x1111111111111111111111111111111111111111',
        }),
      {
        type: 'maxBuilderFee',
        user: LOWER_USER,
        builder: '0x1111111111111111111111111111111111111111',
      },
    );
    await check(() => client.getPerpMetadata({ dex: 'xyz' }), {
      type: 'meta',
      dex: 'xyz',
    });
    await check(() => client.getPerpAssetContexts({ dex: 'xyz' }), {
      type: 'metaAndAssetCtxs',
      dex: 'xyz',
    });
    await check(() => client.getOpenOrders({ user: USER, dex: 'xyz' }), {
      type: 'openOrders',
      user: LOWER_USER,
      dex: 'xyz',
    });
    await check(() => client.getOrderStatus({ user: USER, oid: '0x01' }), {
      type: 'orderStatus',
      user: LOWER_USER,
      oid: '0x01',
    });
    await check(() => client.getPerpAnnotation({ coin: 'BTC' }), {
      type: 'perpAnnotation',
      coin: 'BTC',
    });
    await check(() => client.getPerpDexLimits({ dex: 'xyz' }), {
      type: 'perpDexLimits',
      dex: 'xyz',
    });
    await check(() => client.getPerpDexStatus({ dex: 'xyz' }), {
      type: 'perpDexStatus',
      dex: 'xyz',
    });
    await check(() => client.getPerpsAtOpenInterestCap({ dex: 'xyz' }), {
      type: 'perpsAtOpenInterestCap',
      dex: 'xyz',
    });
    await check(
      () => client.getPreTransferCheck({ user: USER, source: USER }),
      {
        type: 'preTransferCheck',
        user: LOWER_USER,
        source: LOWER_USER,
      },
    );
    await check(() => client.getRecentTrades({ coin: 'BTC' }), {
      type: 'recentTrades',
      coin: 'BTC',
    });
    await check(() => client.getSettledOutcome({ outcome: 10 }), {
      type: 'settledOutcome',
      outcome: 10,
    });
    await check(() => client.getSubAccountsWithAllDexStates({ user: USER }), {
      type: 'subAccounts2',
      user: LOWER_USER,
    });
    await check(() => client.getTokenDetails({ tokenId: '0x01' }), {
      type: 'tokenDetails',
      tokenId: '0x01',
    });
    await check(
      () =>
        client.getUserBorrowLendInterest({
          user: USER,
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'userBorrowLendInterest',
        user: LOWER_USER,
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () =>
        client.getUserFills({
          user: USER,
          aggregateByTime: true,
        }),
      {
        type: 'userFills',
        user: LOWER_USER,
        aggregateByTime: true,
      },
    );
    await check(
      () =>
        client.getUserFillsByTime({
          user: USER,
          aggregateByTime: true,
          reversed: true,
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'userFillsByTime',
        user: LOWER_USER,
        aggregateByTime: true,
        reversed: true,
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () =>
        client.getUserFundingHistory({
          user: USER,
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'userFunding',
        user: LOWER_USER,
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () =>
        client.getUserNonFundingLedgerUpdates({
          user: USER,
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'userNonFundingLedgerUpdates',
        user: LOWER_USER,
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () =>
        client.getUserTwapSliceFillsByTime({
          user: USER,
          startTime: 10,
          endTime: 20,
        }),
      {
        type: 'userTwapSliceFillsByTime',
        user: LOWER_USER,
        startTime: 10,
        endTime: 20,
      },
    );
    await check(
      () => client.getVaultDetails({ vaultAddress: USER, user: USER }),
      {
        type: 'vaultDetails',
        vaultAddress: LOWER_USER,
        user: LOWER_USER,
      },
    );
    await check(() => client.getAlignedQuoteTokenStatus({ token: 7 }), {
      type: 'alignedQuoteTokenInfo',
      token: 7,
    });
  });

  test('strips undefined values from Info requests', async () => {
    const client = new CaptureRestClient();
    await client.getAllMids({ dex: undefined });

    expect(client.requests).toEqual([
      {
        body: { type: 'allMids' },
        path: '/info',
      },
    ]);
  });

  test('trims and lowercases address inputs', async () => {
    const client = new CaptureRestClient();
    await client.getSpotBalances({ user: ` ${USER} ` });

    expect(client.requests).toEqual([
      {
        body: { type: 'spotClearinghouseState', user: LOWER_USER },
        path: '/info',
      },
    ]);
  });

  test('uses a configured account when an account getter omits user', async () => {
    const client = new CaptureRestClient({ accountAddress: USER });

    await client.getSpotBalances();

    await expect(client.getAccountAddress()).resolves.toBe(LOWER_USER);
    expect(client.requests).toEqual([
      {
        body: { type: 'spotClearinghouseState', user: LOWER_USER },
        path: '/info',
      },
    ]);
  });

  test('uses a configured vault before the configured account', async () => {
    const client = new CaptureRestClient({
      accountAddress: OTHER_ACCOUNT,
      vaultAddress: USER,
    });

    await client.getPortfolio();

    await expect(client.getAccountAddress()).resolves.toBe(LOWER_USER);
    expect(client.requests).toEqual([
      {
        body: { type: 'portfolio', user: LOWER_USER },
        path: '/info',
      },
    ]);
  });

  test('resolves and caches an API wallet master for account getters', async () => {
    const client = new CaptureRestClient({ signer });
    client.responseFor = (body) =>
      body.type === 'userRole' ? { data: { user: USER }, role: 'agent' } : {};

    await Promise.all([client.getSpotBalances(), client.getPortfolio()]);
    await expect(client.getAccountAddress()).resolves.toBe(LOWER_USER);

    expect(
      client.requests.filter(
        ({ body }) => (body as { type?: string }).type === 'userRole',
      ),
    ).toHaveLength(1);
    expect(client.requests.slice(1)).toEqual(
      expect.arrayContaining([
        {
          body: { type: 'spotClearinghouseState', user: LOWER_USER },
          path: '/info',
        },
        {
          body: { type: 'portfolio', user: LOWER_USER },
          path: '/info',
        },
      ]),
    );
  });

  test('returns spot and perpetual balances for the resolved account', async () => {
    const client = new CaptureRestClient({ accountAddress: USER });
    const perp = {
      assetPositions: [],
      crossMaintenanceMarginUsed: '0',
      crossMarginSummary: {
        accountValue: '0',
        totalMarginUsed: '0',
        totalNtlPos: '0',
        totalRawUsd: '0',
      },
      marginSummary: {
        accountValue: '0',
        totalMarginUsed: '0',
        totalNtlPos: '0',
        totalRawUsd: '0',
      },
      withdrawable: '0',
    };
    const spot = { balances: [] };
    client.responseFor = (body) =>
      body.type === 'clearinghouseState' ? perp : spot;

    await expect(client.getBalances({ dex: 'xyz' })).resolves.toEqual({
      perp,
      spot,
      user: LOWER_USER,
    });
    expect(client.requests).toEqual([
      {
        body: {
          dex: 'xyz',
          type: 'clearinghouseState',
          user: LOWER_USER,
        },
        path: '/info',
      },
      {
        body: { type: 'spotClearinghouseState', user: LOWER_USER },
        path: '/info',
      },
    ]);
  });

  test('explains how to target account getters without a signer', async () => {
    const client = new CaptureRestClient();

    await expect(client.getSpotBalances()).rejects.toThrow(
      'Provide user, set accountAddress or vaultAddress, or configure privateKey or signer.',
    );
    expect(client.requests).toHaveLength(0);
  });

  test('reports a signer on the wrong network instead of returning empty balances', async () => {
    const client = new CaptureRestClient({ signer });
    client.responseFor = () => ({ role: 'missing' });

    await expect(client.getSpotBalances()).rejects.toThrow(
      'The signer is not a Hyperliquid account on this network.',
    );
    expect(client.requests).toEqual([
      {
        body: { type: 'userRole', user: AGENT },
        path: '/info',
      },
    ]);
  });

  test('raw Info requests remain available for forward compatibility', async () => {
    const client = new CaptureRestClient();
    await client.submitRawInfoRequest({
      type: 'futureInfoOperation',
      value: undefined,
    });
    expect(client.requests).toEqual([
      { body: { type: 'futureInfoOperation' }, path: '/info' },
    ]);
  });

  test('rewrites info coins with official Python name_to_coin', async () => {
    const client = new CaptureRestClient();
    jest
      .spyOn(client.testAssetResolver, 'nameToCoin')
      .mockImplementation(async (name) =>
        name === 'HYPE/USDC' ? '@107' : name,
      );

    await client.getOrderBook({ coin: 'HYPE/USDC' });
    await client.getCandles({
      coin: 'HYPE/USDC',
      endTime: 2,
      interval: '1m',
      startTime: 1,
    });
    await client.getFundingHistory({ coin: 'HYPE/USDC', startTime: 1 });
    await client.getActiveAssetData({ user: USER, coin: 'HYPE/USDC' });

    expect(client.requests).toEqual([
      { body: { coin: '@107', type: 'l2Book' }, path: '/info' },
      {
        body: {
          req: {
            coin: '@107',
            endTime: 2,
            interval: '1m',
            startTime: 1,
          },
          type: 'candleSnapshot',
        },
        path: '/info',
      },
      {
        body: { coin: '@107', startTime: 1, type: 'fundingHistory' },
        path: '/info',
      },
      {
        body: {
          coin: 'HYPE/USDC',
          type: 'activeAssetData',
          user: LOWER_USER,
        },
        path: '/info',
      },
    ]);
  });

  test('exposes asset resolution and manual metadata refresh', async () => {
    const client = new CaptureRestClient();
    const resolved = {
      assetId: 0,
      canonicalName: 'BTC',
      kind: 'perp' as const,
      szDecimals: 5,
    };
    const resolve = jest
      .spyOn(client.testAssetResolver, 'resolve')
      .mockResolvedValue(resolved);
    const refresh = jest
      .spyOn(client.testAssetResolver, 'refresh')
      .mockResolvedValue();

    await expect(client.resolveAsset('BTC')).resolves.toEqual(resolved);
    await expect(client.refreshAssetMetadata()).resolves.toBeUndefined();
    expect(resolve).toHaveBeenCalledWith('BTC');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
