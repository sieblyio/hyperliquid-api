import type {
  CancelStatus,
  ExchangeResponse,
  OrderResponseData,
  OrderStatus,
  RestClient,
  TwapHistoryEntry,
  WebsocketAPIClient,
  WebsocketMessageEvent,
} from '../../src/index.js';

function expectType<T>(...values: T[]): void {
  void values;
}

// Compile-only consumer checks. Neither client sends requests in this test.
async function infoResponses(client: RestClient | WebsocketAPIClient) {
  expectType<number>((await client.getExchangeStatus()).time);
  expectType<number | null | undefined>(
    (await client.getExtraAgents())[0]?.validUntil,
  );
  const [winners, auctions] = await client.getGossipPriorityAuctionStatus();
  expectType<string | null | undefined>(winners[0], auctions[0]?.currentGas);
  expectType<string | undefined>((await client.getGossipRootIps())[0]);
  expectType<string | undefined>((await client.getLeadingVaults())[0]?.address);
  expectType<boolean>((await client.getLegalStatus()).acceptedTerms);
  expectType<number | undefined>(
    (await client.getLiquidatablePositions())[0]?.positionIndex.isolated?.asset,
  );
  expectType<string | undefined>(
    (await client.getMarginTable({ id: 1 })).marginTiers[0]?.lowerBound,
    (await client.getMaxMarketOrderNotionals())[0]?.[1],
  );
  expectType<boolean>(
    (await client.getPreTransferCheck({ source: '0x0', user: '0x1' }))
      .userExists,
  );
  const trades = await client.getRecentTrades({ coin: 'BTC' });
  expectType<string | undefined>(trades[0]?.px, trades[0]?.users[1]);
  // @ts-expect-error Prices remain wire decimal strings, not numbers.
  expectType<number>(trades[0]!.px);

  const accounts = await client.getSubAccountsWithAllDexStates();
  // @ts-expect-error No subaccounts returns null, not an empty array.
  void accounts.length;
  if (accounts) {
    expectType<string | undefined>(
      accounts[0]?.dexToClearinghouseState[0]?.[1].marginSummary.accountValue,
    );
  }
  const history = await client.getTwapHistory();
  expectType<string | undefined>(history[0]?.state.executedSz);
  expectType<string | undefined>(
    (await client.getUserBorrowLendInterest({ startTime: 0 }))[0]?.supply,
  );
  const signers = await client.getMultiSigSigners();
  // @ts-expect-error Ordinary accounts have no multisig signer configuration.
  void signers.threshold;
  if (signers) expectType<number>(signers.threshold);
  expectType<string | undefined>(
    (await client.getUserTwapSliceFillsByTime({ startTime: 0 }))[0]?.fill.px,
  );
  const votes = await client.getValidatorL1Votes();
  expectType<boolean | undefined>(votes[0]?.quorumReached);
  if (votes[0] && 'O' in votes[0].action) {
    const action = votes[0].action.O;
    if ('settleOutcome' in action) {
      expectType<string>(action.settleOutcome.settleFraction);
    }
  }
  expectType<string | undefined>(
    (await client.getValidatorSummaries())[0]?.stats[0]?.[1].predictedApr,
    (await client.getVaultSummaries())[0]?.tvl,
    (await client.getWebData2()).spotState?.balances[0]?.total,
    (await client.getAlignedQuoteTokenStatus({ token: 0 }))
      .dailyAmountOwed[0]?.[1],
    (await client.getReferralInfo()).rewardHistory[0]?.earned,
  );
  const vault = await client.getVaultDetails({ vaultAddress: '0x0' });
  if (vault?.relationship.type === 'parent') {
    expectType<string | undefined>(vault.relationship.data.childAddresses[0]);
  }
}
void infoResponses;

async function exchangeResponses(client: RestClient | WebsocketAPIClient) {
  const created: ExchangeResponse<string> = await client.createSubAccount({
    name: 'Example',
  });
  if (created.status === 'ok') {
    expectType<string>(created.response.data);
    expectType<string>(created.response.type);
  } else {
    expectType<string>(created.response);
  }
  const vault = await client.createVault({
    name: 'Example',
    description: '',
    initialUsd: 100,
  });
  if (vault.status === 'ok') expectType<string>(vault.response.data);
  const result: ExchangeResponse = await client.setDisplayName({
    displayName: 'Example',
  });
  if (result.status === 'ok') {
    expectType<'default'>(result.response.type);
    // @ts-expect-error Default acknowledgements have no result data.
    void result.response.data;
  }

  const order = await client.submitLimitOrder({
    symbol: 'BTC',
    side: 'buy',
    price: '1',
    size: '0.001',
    timeInForce: 'IOC',
  });
  if (order.status === 'ok') {
    expectType<OrderStatus[]>(order.response.data.statuses);
  } else {
    expectType<string>(order.response);
    // @ts-expect-error Error responses are messages, not result data.
    void order.response.data;
  }
  const cancelled = await client.cancelOrders({
    cancels: [{ a: 'BTC', o: 1 }],
  });
  if (cancelled.status === 'ok') {
    expectType<CancelStatus[]>(cancelled.response.data.statuses);
  }

  // Raw responses accept acknowledgements and results with unknown data.
  expectType<ExchangeResponse<unknown>>(result, order, created);
  const raw = await client.submitRawL1Action({ type: 'noop' });
  if (raw.status === 'ok') {
    expectType<string>(raw.response.type);
    expectType<unknown>(raw.response.data);
    // @ts-expect-error Raw actions do not promise an order result.
    expectType<OrderResponseData>(raw.response.data);
  }
}
void exchangeResponses;

function twapStatus(entry: TwapHistoryEntry) {
  if (entry.status.status === 'error') {
    expectType<string>(entry.status.description);
  } else {
    // @ts-expect-error Successful TWAP statuses need not contain an error message.
    void entry.status.description;
  }
}
void twapStatus;

function websocketResponses(event: WebsocketMessageEvent) {
  switch (event.channel) {
    case 'activeAssetCtx':
      expectType<string>(event.data.ctx.funding);
      break;
    case 'activeSpotAssetCtx':
      expectType<string>(event.data.ctx.circulatingSupply);
      // @ts-expect-error Spot context does not have perpetual funding rates.
      void event.data.ctx.funding;
      break;
    case 'activeAssetData':
      if (event.data.leverage.type === 'isolated') {
        expectType<string>(event.data.leverage.rawUsd);
      }
      break;
    case 'assetCtxs':
      expectType<string | undefined>(event.data.ctxs[0]?.markPx);
      break;
    case 'allDexsAssetCtxs':
      expectType<string | undefined>(event.data.ctxs[0]?.[1][0]?.markPx);
      break;
    case 'clearinghouseState':
      expectType<string>(
        event.data.clearinghouseState.marginSummary.accountValue,
      );
      break;
    case 'allDexsClearinghouseState':
      expectType<string | undefined>(
        event.data.clearinghouseStates[0]?.[1].withdrawable,
      );
      break;
    case 'spotAssetCtxs':
      expectType<string | undefined>(event.data[0]?.circulatingSupply);
      break;
    case 'spotState':
      expectType<string | undefined>(event.data.spotState.balances[0]?.total);
      break;
    case 'userHistoricalOrders':
      expectType<boolean | undefined>(
        event.data.orderHistory[0]?.order.reduceOnly,
      );
      break;
    case 'userNonFundingLedgerUpdates': {
      const delta = event.data.nonFundingLedgerUpdates[0]?.delta;
      if (delta?.type === 'vaultWithdraw') {
        expectType<string>(delta.netWithdrawnUsd, delta.vault);
      }
      if (delta?.type === 'accountClassTransfer') {
        expectType<boolean>(delta.toPerp);
        // @ts-expect-error Account class transfers do not have vault withdrawal data.
        void delta.netWithdrawnUsd;
      }
      break;
    }
    case 'userTwapHistory':
      expectType<string | undefined>(event.data.history[0]?.state.sz);
      break;
    case 'userTwapSliceFills':
      expectType<string | undefined>(event.data.twapSliceFills[0]?.fill.fee);
      break;
    case 'twapStates':
      expectType<string | undefined>(event.data.states[0]?.[1].executedSz);
      break;
    case 'webData3':
      expectType<string | undefined>(
        event.data.perpDexStates[0]?.totalVaultEquity,
      );
      break;
    case 'user':
      if ('twapHistory' in event.data) {
        expectType<string | undefined>(
          event.data.twapHistory[0]?.state.executedNtl,
        );
      }
      if ('twapSliceFills' in event.data) {
        expectType<number | undefined>(event.data.twapSliceFills[0]?.twapId);
      }
      break;
  }
}
void websocketResponses;
