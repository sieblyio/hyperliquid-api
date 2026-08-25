import { MAINNET_API_URL, TESTNET_API_URL } from './constants.js';
import { AccountResolver } from './lib/account-resolver.js';
import type { AssetIdentifier } from './lib/action-factory.js';
import type { ResolvedAsset } from './lib/asset-resolver.js';
import { BaseRestClient } from './lib/BaseRestClient.js';
import { decimalToWire } from './lib/decimal.js';
import { normalizeAddresses } from './lib/normalize-addresses.js';
import {
  decimalOrSubaccountAmount,
  floorDecimalPlaces,
  marketLimitPrice,
  normalizeUserRequest,
  positiveDecimal,
} from './lib/request-utils.js';
import { USER_SIGNED_ACTIONS } from './lib/user-signed-actions.js';
import type {
  ApproveApiWalletRequest,
  CancelOrdersByClientOrderIdRequest,
  CancelOrdersRequest,
  CancelTwapOrderRequest,
  ConvertToMultiSigUserRequest,
  DelegateOrUndelegateStakeRequest,
  DeployPerpRequest,
  DeploySpotRequest,
  L1RequestOptions,
  LinkStakingAccountRequest,
  ModifyOrderRequest,
  ModifyOrdersRequest,
  SendAssetFromApiWalletRequest,
  SendAssetRequest,
  SendSpotAssetRequest,
  SendToEvmWithDataRequest,
  SendUsdRequest,
  SetIsolatedMarginLeverageRequest,
  SetUserAbstractionRequest,
  SubmitLimitOrderRequest,
  SubmitMarketCloseRequest,
  SubmitMarketOrderRequest,
  SubmitOrderRequest,
  SubmitTwapOrderRequest,
  SubmitUserOutcomeRequest,
  TransferSpotToOrFromSubAccountRequest,
  TransferUsdBetweenSpotAndPerpRequest,
  TransferUsdToOrFromSubAccountRequest,
  TransferVaultFundsRequest,
  UpdateIsolatedMarginRequest,
  UpdateLeverageRequest,
  UserSignedRequestOptions,
  UserToggleRequest,
  WithdrawUsdRequest,
} from './types/request/exchange.types.js';
import type {
  AccountDexRequest,
  AccountRequest,
  GetCandlesRequest,
  GetFundingHistoryRequest,
  GetMaxBuilderFeeRequest,
  GetOrderBookRequest,
  GetOrderStatusRequest,
  GetPreTransferCheckRequest,
  GetUserBorrowLendInterestRequest,
  GetUserFillsByTimeRequest,
  GetUserFillsRequest,
  GetUserFundingHistoryRequest,
  GetUserNonFundingLedgerUpdatesRequest,
  GetUserTwapSliceFillsByTimeRequest,
  GetVaultDetailsRequest,
  UserRequest,
} from './types/request/info.types.js';
import type {
  ExchangeResponse,
  OrderResponseData,
} from './types/response/exchange.types.js';
import type {
  AccountBalancesResponse,
  AllMidsResponse,
  Candle,
  InfoResponse,
  OpenOrder,
  OrderBookResponse,
  PerpAccountSummaryResponse,
  PerpMeta,
  SpotBalancesResponse,
  SpotMeta,
  UserFill,
  UserRoleResponse,
} from './types/response/info.types.js';
import type {
  JsonObject,
  RestClientNetworkOptions,
  RestClientOptions,
} from './types/shared.types.js';

type InfoParams = object;

const DEFAULT_MARKET_ORDER_SLIPPAGE = 0.05;

function hip3Dex(canonicalName: string): string | undefined {
  return canonicalName.includes(':')
    ? canonicalName.split(':', 1)[0]
    : undefined;
}

function perpPositionCoin(
  entry: unknown,
): { coin: string; szi: string } | undefined {
  if (!entry || typeof entry !== 'object' || !('position' in entry)) {
    return undefined;
  }
  const position = (entry as { position: unknown }).position;
  if (!position || typeof position !== 'object') {
    return undefined;
  }
  const { coin, szi } = position as { coin?: unknown; szi?: unknown };
  if (typeof coin !== 'string' || typeof szi !== 'string') {
    return undefined;
  }
  return { coin, szi };
}

export class RestClient extends BaseRestClient {
  private readonly accountResolver: AccountResolver;

  constructor(
    options: RestClientOptions = {},
    networkOptions: RestClientNetworkOptions = {},
  ) {
    super(
      options.baseUrl ??
        (options.testnet === true ? TESTNET_API_URL : MAINNET_API_URL),
      options,
      networkOptions,
    );
    this.accountResolver = new AccountResolver(this.actionBuilder, (user) =>
      this.info<UserRoleResponse>('userRole', { user }),
    );
  }

  resolveAsset(identifier: AssetIdentifier): Promise<ResolvedAsset> {
    return this.assetResolver.resolve(identifier);
  }

  nameToCoin(name: string): Promise<string> {
    return this.assetResolver.nameToCoin(name);
  }

  refreshAssetMetadata(): Promise<void> {
    return this.assetResolver.refresh();
  }

  getAccountAddress(): Promise<string> {
    return this.resolveAccountAddress(undefined);
  }

  getAllMids(params: { dex?: string } = {}): Promise<AllMidsResponse> {
    return this.info('allMids', params);
  }

  getActiveAssetData(
    params: AccountRequest & { coin: string },
  ): Promise<InfoResponse> {
    return this.accountInfo('activeAssetData', params);
  }

  getAllBorrowLendReserveStates(): Promise<InfoResponse> {
    return this.info('allBorrowLendReserveStates', {});
  }

  getAllPerpMetadata(): Promise<InfoResponse> {
    return this.info('allPerpMetas', {});
  }

  getApprovedBuilders(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('approvedBuilders', params);
  }

  getBorrowLendReserveState(params: { token: number }): Promise<InfoResponse> {
    return this.info('borrowLendReserveState', params);
  }

  getUserBorrowLendState(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('borrowLendUserState', params);
  }

  async getCandles(params: GetCandlesRequest): Promise<Candle[]> {
    return this.info('candleSnapshot', {
      req: { ...params, coin: await this.nameToCoin(params.coin) },
    });
  }

  getPerpAccountSummary(
    params: AccountDexRequest = {},
  ): Promise<PerpAccountSummaryResponse> {
    return this.accountInfo('clearinghouseState', params);
  }

  getStakingDelegations(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('delegations', params);
  }

  getStakingHistory(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('delegatorHistory', params);
  }

  getStakingRewards(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('delegatorRewards', params);
  }

  getStakingSummary(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('delegatorSummary', params);
  }

  getExchangeStatus(): Promise<InfoResponse> {
    return this.info('exchangeStatus', {});
  }

  getExtraAgents(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('extraAgents', params);
  }

  getFrontendOpenOrders(params: AccountDexRequest = {}): Promise<OpenOrder[]> {
    return this.accountInfo('frontendOpenOrders', params);
  }

  async getFundingHistory(
    params: GetFundingHistoryRequest,
  ): Promise<InfoResponse> {
    return this.info('fundingHistory', {
      ...params,
      coin: await this.nameToCoin(params.coin),
    });
  }

  getGossipPriorityAuctionStatus(): Promise<InfoResponse> {
    return this.info('gossipPriorityAuctionStatus', {});
  }

  getGossipRootIps(): Promise<InfoResponse> {
    return this.info('gossipRootIps', {});
  }

  getOrderHistory(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('historicalOrders', params);
  }

  getVipStatus(params: AccountRequest = {}): Promise<boolean> {
    return this.accountInfo('isVip', params);
  }

  async getOrderBook(
    params: GetOrderBookRequest,
  ): Promise<OrderBookResponse | null> {
    return this.info('l2Book', {
      ...params,
      coin: await this.nameToCoin(params.coin),
    });
  }

  getLeadingVaults(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('leadingVaults', params);
  }

  getLegalStatus(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('legalCheck', params);
  }

  getLiquidatablePositions(): Promise<InfoResponse> {
    return this.info('liquidatable', {});
  }

  getMarginTable(params: { id: number }): Promise<InfoResponse> {
    return this.info('marginTable', params);
  }

  getMaxBuilderFee(params: GetMaxBuilderFeeRequest): Promise<number> {
    return this.accountInfo('maxBuilderFee', params);
  }

  getMaxMarketOrderNotionals(): Promise<InfoResponse> {
    return this.info('maxMarketOrderNtls', {});
  }

  getPerpMetadata(params: { dex?: string } = {}): Promise<PerpMeta> {
    return this.info('meta', params);
  }

  getPerpAssetContexts(params: { dex?: string } = {}): Promise<InfoResponse> {
    return this.info('metaAndAssetCtxs', params);
  }

  getOpenOrders(params: AccountDexRequest = {}): Promise<OpenOrder[]> {
    return this.accountInfo('openOrders', params);
  }

  getOrderStatus(params: GetOrderStatusRequest): Promise<InfoResponse> {
    return this.accountInfo('orderStatus', params);
  }

  getOutcomeMetadata(): Promise<InfoResponse> {
    return this.info('outcomeMeta', {});
  }

  getPerpAnnotation(params: { coin: string }): Promise<InfoResponse> {
    return this.info('perpAnnotation', params);
  }

  getPerpCategories(): Promise<InfoResponse> {
    return this.info('perpCategories', {});
  }

  getConcisePerpAnnotations(): Promise<InfoResponse> {
    return this.info('perpConciseAnnotations', {});
  }

  getPerpDeployAuctionStatus(): Promise<InfoResponse> {
    return this.info('perpDeployAuctionStatus', {});
  }

  getPerpDexLimits(params: { dex: string }): Promise<InfoResponse> {
    return this.info('perpDexLimits', params);
  }

  getPerpDexStatus(params: { dex: string }): Promise<InfoResponse> {
    return this.info('perpDexStatus', params);
  }

  getPerpDexs(): Promise<InfoResponse> {
    return this.info('perpDexs', {});
  }

  getPerpsAtOpenInterestCap(params: { dex?: string } = {}): Promise<string[]> {
    return this.info('perpsAtOpenInterestCap', params);
  }

  getPortfolio(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('portfolio', params);
  }

  getPreTransferCheck(
    params: GetPreTransferCheckRequest,
  ): Promise<InfoResponse> {
    return this.info('preTransferCheck', normalizeAddresses(params));
  }

  getPredictedFundingRates(): Promise<InfoResponse> {
    return this.info('predictedFundings', {});
  }

  getRecentTrades(params: { coin: string }): Promise<InfoResponse> {
    return this.info('recentTrades', params);
  }

  getReferralInfo(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('referral', params);
  }

  getSettledOutcome(params: { outcome: number }): Promise<InfoResponse> {
    return this.info('settledOutcome', params);
  }

  async getBalances(
    params: AccountDexRequest = {},
  ): Promise<AccountBalancesResponse> {
    const user = await this.resolveAccountAddress(params.user);
    const [perp, spot] = await Promise.all([
      this.getPerpAccountSummary({
        user,
        ...(params.dex === undefined ? {} : { dex: params.dex }),
      }),
      this.getSpotBalances({ user }),
    ]);

    return { perp, spot, user };
  }

  getSpotBalances(params: AccountRequest = {}): Promise<SpotBalancesResponse> {
    return this.accountInfo('spotClearinghouseState', params);
  }

  getSpotDeployAuctionStatus(
    params: AccountRequest = {},
  ): Promise<InfoResponse> {
    return this.accountInfo('spotDeployState', params);
  }

  getSpotMetadata(): Promise<SpotMeta> {
    return this.info('spotMeta', {});
  }

  getSpotAssetContexts(): Promise<InfoResponse> {
    return this.info('spotMetaAndAssetCtxs', {});
  }

  getSpotPairDeployAuctionStatus(): Promise<InfoResponse> {
    return this.info('spotPairDeployAuctionStatus', {});
  }

  getSubAccounts(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('subAccounts', params);
  }

  getSubAccountsWithAllDexStates(
    params: AccountRequest = {},
  ): Promise<InfoResponse> {
    return this.accountInfo('subAccounts2', params);
  }

  getTokenDetails(params: { tokenId: string }): Promise<InfoResponse> {
    return this.info('tokenDetails', params);
  }

  getTwapHistory(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('twapHistory', params);
  }

  getUserAbstraction(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userAbstraction', params);
  }

  getUserBorrowLendInterest(
    params: GetUserBorrowLendInterestRequest,
  ): Promise<InfoResponse> {
    return this.accountInfo('userBorrowLendInterest', params);
  }

  getUserDexAbstraction(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userDexAbstraction', params);
  }

  getUserFees(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userFees', params);
  }

  getUserFills(params: GetUserFillsRequest = {}): Promise<UserFill[]> {
    return this.accountInfo('userFills', params);
  }

  getUserFillsByTime(params: GetUserFillsByTimeRequest): Promise<UserFill[]> {
    return this.accountInfo('userFillsByTime', params);
  }

  getUserFundingHistory(
    params: GetUserFundingHistoryRequest = {},
  ): Promise<InfoResponse> {
    return this.accountInfo('userFunding', params);
  }

  getUserNonFundingLedgerUpdates(
    params: GetUserNonFundingLedgerUpdatesRequest = {},
  ): Promise<InfoResponse> {
    return this.accountInfo('userNonFundingLedgerUpdates', params);
  }

  getUserRateLimit(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userRateLimit', params);
  }

  getUserRole(params: UserRequest): Promise<UserRoleResponse> {
    return this.info('userRole', normalizeUserRequest(params));
  }

  getMultiSigSigners(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userToMultiSigSigners', params);
  }

  getUserTwapSliceFills(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userTwapSliceFills', params);
  }

  getUserTwapSliceFillsByTime(
    params: GetUserTwapSliceFillsByTimeRequest,
  ): Promise<InfoResponse> {
    return this.accountInfo('userTwapSliceFillsByTime', params);
  }

  getUserVaultDeposits(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userVaultEquities', params);
  }

  getValidatorL1Votes(): Promise<InfoResponse> {
    return this.info('validatorL1Votes', {});
  }

  getValidatorSummaries(): Promise<InfoResponse> {
    return this.info('validatorSummaries', {});
  }

  getVaultDetails(params: GetVaultDetailsRequest): Promise<InfoResponse> {
    return this.info('vaultDetails', normalizeAddresses(params));
  }

  getVaultSummaries(): Promise<InfoResponse> {
    return this.info('vaultSummaries', {});
  }

  getWebData2(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('webData2', params);
  }

  getAlignedQuoteTokenStatus(params: { token: number }): Promise<InfoResponse> {
    return this.info('alignedQuoteTokenInfo', params);
  }

  async submitOrder(
    params: SubmitOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    const action = await this.actionBuilder.actions.order(
      params.orders,
      params.grouping,
    );
    return this.submitRawL1Action(action, options);
  }

  async submitMarketOrder(
    params: SubmitMarketOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    const maxSlippage = params.maxSlippage ?? DEFAULT_MARKET_ORDER_SLIPPAGE;
    if (!Number.isFinite(maxSlippage) || maxSlippage < 0 || maxSlippage >= 1) {
      throw new RangeError('maxSlippage must be at least 0 and less than 1.');
    }
    positiveDecimal(params.size, 'size');

    const asset = await this.resolveAsset(params.symbol);
    if (asset.szDecimals === undefined) {
      throw new TypeError(
        `Market order metadata is unavailable for "${asset.canonicalName}". Use a metadata-derived symbol instead of a numeric asset ID.`,
      );
    }

    const dex = hip3Dex(asset.canonicalName);
    const mid =
      params.price ??
      (await this.getAllMids(dex ? { dex } : {}))[asset.canonicalName];
    if (mid === undefined) {
      throw new TypeError(
        `Hyperliquid did not return a midpoint for "${asset.canonicalName}".`,
      );
    }

    const isBuy = params.side === 'buy';

    return this.submitOrder(
      {
        orders: [
          {
            a: asset.assetId,
            b: isBuy,
            ...(params.clientOrderId === undefined
              ? {}
              : { c: params.clientOrderId }),
            p: marketLimitPrice(mid, isBuy, maxSlippage, asset),
            r: params.reduceOnly ?? false,
            s: floorDecimalPlaces(params.size, asset.szDecimals, 'size'),
            t: { limit: { tif: 'Ioc' } },
          },
        ],
      },
      options,
    );
  }

  async submitMarketClose(
    params: SubmitMarketCloseRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    const asset = await this.resolveAsset(params.symbol);
    const dex = hip3Dex(asset.canonicalName);
    const summary = await this.getPerpAccountSummary(dex ? { dex } : {});
    const requested =
      typeof params.symbol === 'string' ? params.symbol : asset.canonicalName;
    const position = summary.assetPositions
      .map(perpPositionCoin)
      .find(
        (item) =>
          item?.coin === asset.canonicalName || item?.coin === requested,
      );
    if (!position) {
      throw new TypeError(`No perpetual position found for "${requested}".`);
    }

    const size =
      params.size ??
      (position.szi.startsWith('-') ? position.szi.slice(1) : position.szi);

    return this.submitMarketOrder(
      {
        ...(params.clientOrderId === undefined
          ? {}
          : { clientOrderId: params.clientOrderId }),
        ...(params.maxSlippage === undefined
          ? {}
          : { maxSlippage: params.maxSlippage }),
        ...(params.price === undefined ? {} : { price: params.price }),
        reduceOnly: true,
        side: position.szi.startsWith('-') ? 'buy' : 'sell',
        size,
        symbol: params.symbol,
      },
      options,
    );
  }

  async submitLimitOrder(
    params: SubmitLimitOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    return this.submitOrder(
      {
        orders: [
          {
            a: params.symbol,
            b: params.side === 'buy',
            ...(params.clientOrderId === undefined
              ? {}
              : { c: params.clientOrderId }),
            p: positiveDecimal(params.price, 'price'),
            r: params.reduceOnly ?? false,
            s: positiveDecimal(params.size, 'size'),
            t: {
              limit: {
                tif: params.postOnly
                  ? 'Alo'
                  : params.timeInForce === 'IOC'
                    ? 'Ioc'
                    : 'Gtc',
              },
            },
          },
        ],
      },
      options,
    );
  }

  async modifyOrder(
    params: ModifyOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.modify(params, params.alwaysPlace),
      options,
    );
  }

  async modifyOrders(
    params: ModifyOrdersRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.batchModify(
        params.modifies,
        params.alwaysPlace,
      ),
      options,
    );
  }

  async cancelOrders(
    params: CancelOrdersRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.cancel(
        params.cancels,
        params.fastCancel,
      ),
      options,
    );
  }

  async cancelOrdersByClientOrderId(
    params: CancelOrdersByClientOrderIdRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.cancelByCloid(
        params.cancels,
        params.fastCancel,
      ),
      options,
    );
  }

  updateLeverage(
    params: UpdateLeverageRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'updateLeverage',
      {
        asset: params.asset,
        isCross: params.isCross,
        leverage: params.leverage,
      },
      options,
    );
  }

  updateIsolatedMargin(
    params: UpdateIsolatedMarginRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('updateIsolatedMargin', params, options);
  }

  setIsolatedMarginLeverage(
    params: SetIsolatedMarginLeverageRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'topUpIsolatedOnlyMargin',
      { ...params, leverage: decimalToWire(params.leverage) },
      options,
    );
  }

  submitTwapOrder(
    params: SubmitTwapOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('twapOrder', { twap: params }, options);
  }

  cancelTwapOrder(
    params: CancelTwapOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('twapCancel', params, options);
  }

  setCancelAllAfter(
    params: { time?: number } = {},
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('scheduleCancel', params, options);
  }

  setReferrer(options: L1RequestOptions = {}): Promise<ExchangeResponse> {
    const { referralCode } = this.actionBuilder.partnerConfiguration();
    return this.l1('setReferrer', { code: referralCode }, options);
  }

  registerReferrer(
    params: { code: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('registerReferrer', params, options);
  }

  async approveBuilderFee(
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    const partner = this.actionBuilder.partnerConfiguration();
    const response = await this.userSigned(
      'approveBuilderFee',
      {
        builder: partner.builder.b,
        maxFeeRate: partner.approvalPercentage,
      },
      USER_SIGNED_ACTIONS.approveBuilderFee,
      options,
    );
    if (response.status === 'ok') {
      this.actionBuilder.confirmBuilderFeeApproval();
    }
    return response;
  }

  approveApiWallet(
    params: ApproveApiWalletRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'approveAgent',
      {
        agentAddress: params.agentAddress,
        agentName: params.agentName ?? '',
      },
      USER_SIGNED_ACTIONS.approveAgent,
      options,
    );
  }

  sendUsd(
    params: SendUsdRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'usdSend',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.usdSend,
      options,
    );
  }

  sendSpotAsset(
    params: SendSpotAssetRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'spotSend',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.spotSend,
      options,
    );
  }

  withdrawUsd(
    params: WithdrawUsdRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'withdraw3',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.withdraw,
      options,
    );
  }

  transferUsdBetweenSpotAndPerp(
    params: TransferUsdBetweenSpotAndPerpRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'usdClassTransfer',
      { ...params, amount: decimalOrSubaccountAmount(params.amount) },
      USER_SIGNED_ACTIONS.usdClassTransfer,
      options,
    );
  }

  sendAsset(
    params: SendAssetRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'sendAsset',
      {
        ...params,
        amount: decimalToWire(params.amount),
        fromSubAccount: params.fromSubAccount ?? '',
      },
      USER_SIGNED_ACTIONS.sendAsset,
      options,
    );
  }

  sendToEvmWithData(
    params: SendToEvmWithDataRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'sendToEvmWithData',
      { ...params, amount: decimalToWire(params.amount) },
      USER_SIGNED_ACTIONS.sendToEvmWithData,
      options,
    );
  }

  sendAssetFromApiWallet(
    params: SendAssetFromApiWalletRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'agentSendAsset',
      {
        ...params,
        amount: decimalToWire(params.amount),
        fromSubAccount: params.fromSubAccount ?? '',
        nonce: 0,
      },
      options,
    );
  }

  depositIntoStaking(
    params: { wei: number },
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'cDeposit',
      params,
      USER_SIGNED_ACTIONS.cDeposit,
      options,
    );
  }

  withdrawFromStaking(
    params: { wei: number },
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'cWithdraw',
      params,
      USER_SIGNED_ACTIONS.cWithdraw,
      options,
    );
  }

  delegateOrUndelegateStake(
    params: DelegateOrUndelegateStakeRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'tokenDelegate',
      params,
      USER_SIGNED_ACTIONS.tokenDelegate,
      options,
    );
  }

  convertToMultiSigUser(
    params: ConvertToMultiSigUserRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    const signers = JSON.stringify(
      params.signers
        ? {
            authorizedUsers: params.signers.authorizedUsers.map((user) =>
              normalizeAddresses(user),
            ),
            threshold: params.signers.threshold,
          }
        : null,
    );

    return this.userSigned(
      'convertToMultiSigUser',
      { signers },
      USER_SIGNED_ACTIONS.convertToMultiSigUser,
      options,
    );
  }

  linkStakingAccount(
    params: LinkStakingAccountRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'linkStakingUser',
      params,
      USER_SIGNED_ACTIONS.linkStakingUser,
      options,
    );
  }

  disableStakingTradingLink(
    params: { tradingUser: string },
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'stakingLinkDisableTradingUser',
      params,
      USER_SIGNED_ACTIONS.stakingLinkDisableTradingUser,
      options,
    );
  }

  setUserPortfolioMargin(
    params: UserToggleRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'userPortfolioMargin',
      params,
      USER_SIGNED_ACTIONS.userPortfolioMargin,
      options,
    );
  }

  setUserAbstraction(
    params: SetUserAbstractionRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'userSetAbstraction',
      params,
      USER_SIGNED_ACTIONS.userSetAbstraction,
      options,
    );
  }

  setUserDexAbstraction(
    params: UserToggleRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.userSigned(
      'userDexAbstraction',
      params,
      USER_SIGNED_ACTIONS.userDexAbstraction,
      options,
    );
  }

  enableApiWalletDexAbstraction(
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('agentEnableDexAbstraction', {}, options);
  }

  setApiWalletAbstraction(
    params: { abstraction: 'i' | 'p' | 'u' },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('agentSetAbstraction', params, options);
  }

  executeBorrowLendOperation(
    params: {
      amount: string | null;
      operation: 'borrow' | 'repay' | 'supply' | 'withdraw';
      token: number;
    },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'borrowLend',
      {
        ...params,
        amount: params.amount === null ? null : decimalToWire(params.amount),
      },
      options,
    );
  }

  claimRewards(options: L1RequestOptions = {}): Promise<ExchangeResponse> {
    return this.l1('claimRewards', {}, options);
  }

  createSubAccount(
    params: { name: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('createSubAccount', params, options);
  }

  createVault(
    params: { description: string; initialUsd: number; name: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<string>> {
    return this.l1('createVault', { ...params, nonce: 0 }, options) as Promise<
      ExchangeResponse<string>
    >;
  }

  setEvmBigBlocks(
    params: { usingBigBlocks: boolean },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('evmUserModify', params, options);
  }

  finalizeEvmContract(
    params: {
      input:
        | 'customStorageSlot'
        | 'firstStorageSlot'
        | { create: { nonce: number } };
      token: number;
    },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('finalizeEvmContract', params, options);
  }

  submitGossipPriorityBid(
    params: { ip: string; maxGas: number; slotId: 0 | 1 },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('gossipPriorityBid', params, options);
  }

  transferHip3LiquidatorFunds(
    params: { dex: string; isDeposit: boolean; ntl: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('hip3LiquidatorTransfer', params, options);
  }

  invalidateNonce(options: L1RequestOptions = {}): Promise<ExchangeResponse> {
    return this.l1('noop', {}, options);
  }

  deployPerp(
    params: DeployPerpRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('perpDeploy', params, options);
  }

  deploySpot(
    params: DeploySpotRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('spotDeploy', params, options);
  }

  reserveAdditionalActions(
    params: { weight: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('reserveRequestWeight', params, options);
  }

  setDisplayName(
    params: { displayName: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('setDisplayName', params, options);
  }

  setSpotDusting(
    params: { toggleSpotDusting: { optOut: boolean } },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('spotUser', params, options);
  }

  renameSubAccount(
    params: { name: string; subAccountUser: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('subAccountModify', params, options);
  }

  transferSpotToOrFromSubAccount(
    params: TransferSpotToOrFromSubAccountRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'subAccountSpotTransfer',
      { ...params, amount: decimalToWire(params.amount) },
      options,
    );
  }

  transferUsdToOrFromSubAccount(
    params: TransferUsdToOrFromSubAccountRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('subAccountTransfer', params, options);
  }

  transferVaultFunds(
    params: TransferVaultFundsRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('vaultTransfer', params, options);
  }

  distributeVaultFunds(
    params: { usd: number; vaultAddress: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('vaultDistribute', params, options);
  }

  modifyVault(
    params: {
      allowDeposits?: boolean | null;
      alwaysCloseOnWithdraw?: boolean | null;
      vaultAddress: string;
    },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'vaultModify',
      {
        allowDeposits: params.allowDeposits ?? null,
        alwaysCloseOnWithdraw: params.alwaysCloseOnWithdraw ?? null,
        vaultAddress: params.vaultAddress,
      },
      options,
    );
  }

  updateValidatorL1Stream(
    params: { riskFreeRate: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1(
      'validatorL1Stream',
      { riskFreeRate: decimalToWire(params.riskFreeRate) },
      options,
    );
  }

  submitSignerAction(
    params: { jailSelf: null } | { unjailSelf: null },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('CSignerAction', params, options);
  }

  submitValidatorAction(
    params: Omit<JsonObject, 'type'>,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('CValidatorAction', params, options);
  }

  authorizeAqav2Role(
    params: { role: 'technical' | 'treasury'; token: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('authorizeAqav2Role', params, options);
  }

  submitUserOutcome(
    params: SubmitUserOutcomeRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('userOutcome', params, options);
  }

  private async accountInfo<T>(type: string, params: InfoParams): Promise<T> {
    const { user: requestedUser, ...fields } = params as AccountRequest &
      Record<string, unknown>;
    const user = await this.resolveAccountAddress(requestedUser);

    return this.info<T>(type, normalizeAddresses({ user, ...fields }));
  }

  private async resolveAccountAddress(requestedUser?: string): Promise<string> {
    return this.accountResolver.resolveAccountAddress(requestedUser);
  }
}
