import { MAINNET_API_URL, TESTNET_API_URL } from './constants.js';
import { AccountResolver } from './lib/account-resolver.js';
import type {
  AssetIdentifier,
  Grouping,
  ModifyWireInput,
  OrderWireInput,
} from './lib/action-factory.js';
import type { ResolvedAsset } from './lib/asset-resolver.js';
import {
  type ActionSubmissionOptions,
  BaseRestClient,
} from './lib/BaseRestClient.js';
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
  RequestOptions,
  RestClientNetworkOptions,
  RestClientOptions,
} from './types/shared.types.js';

type InfoParams = object;

type BuilderApprovalState =
  'approved' | 'checking' | 'unapproved' | 'unavailable' | 'unchecked';

interface BuilderApprovalOwner {
  address: string;
  canAutoApprove: boolean;
}

const BUILDER_APPROVAL_PREFLIGHT_BUDGET_MS = 1_000;
const DEFAULT_MARKET_ORDER_SLIPPAGE = 0.05;

const TRADING_ACTIONS = new Set([
  'batchModify',
  'cancel',
  'cancelByCloid',
  'modify',
  'order',
  'scheduleCancel',
  'twapCancel',
  'twapOrder',
]);

export class RestClient extends BaseRestClient {
  private readonly accountResolver: AccountResolver;

  private builderApprovalPromise: Promise<void> | undefined;

  private builderApprovalState: BuilderApprovalState = 'unchecked';

  private builderPreflightDeadline: number | undefined;

  private referralAttempted = false;

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
    this.accountResolver = new AccountResolver(
      this.actionBuilder,
      (user, requestOptions) =>
        this.info<UserRoleResponse>('userRole', { user }, requestOptions),
    );
  }

  resolveAsset(identifier: AssetIdentifier): Promise<ResolvedAsset> {
    return this.assetResolver.resolve(identifier);
  }

  refreshAssetMetadata(): Promise<void> {
    return this.assetResolver.refresh();
  }

  getAccountAddress(requestOptions?: RequestOptions): Promise<string> {
    return this.resolveAccountAddress(undefined, requestOptions);
  }

  getAllMids(
    params: { dex?: string } = {},
    requestOptions?: RequestOptions,
  ): Promise<AllMidsResponse> {
    return this.info('allMids', params, requestOptions);
  }

  async getActiveAssetData(
    params: AccountRequest & { coin: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo(
      'activeAssetData',
      {
        ...params,
        coin: await this.infoCoin(params.coin),
      },
      requestOptions,
    );
  }

  getAllBorrowLendReserveStates(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('allBorrowLendReserveStates', {}, requestOptions);
  }

  getAllPerpMetadata(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('allPerpMetas', {}, requestOptions);
  }

  getApprovedBuilders(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('approvedBuilders', params, requestOptions);
  }

  getBorrowLendReserveState(
    params: { token: number },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('borrowLendReserveState', params, requestOptions);
  }

  getUserBorrowLendState(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('borrowLendUserState', params, requestOptions);
  }

  async getCandles(
    params: GetCandlesRequest,
    requestOptions?: RequestOptions,
  ): Promise<Candle[]> {
    return this.info(
      'candleSnapshot',
      {
        req: {
          ...params,
          coin: await this.infoCoin(params.coin),
        },
      },
      requestOptions,
    );
  }

  getPerpAccountSummary(
    params: AccountDexRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<PerpAccountSummaryResponse> {
    return this.accountInfo('clearinghouseState', params, requestOptions);
  }

  getStakingDelegations(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('delegations', params, requestOptions);
  }

  getStakingHistory(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('delegatorHistory', params, requestOptions);
  }

  getStakingRewards(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('delegatorRewards', params, requestOptions);
  }

  getStakingSummary(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('delegatorSummary', params, requestOptions);
  }

  getExchangeStatus(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('exchangeStatus', {}, requestOptions);
  }

  getExtraAgents(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('extraAgents', params, requestOptions);
  }

  getFrontendOpenOrders(
    params: AccountDexRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<OpenOrder[]> {
    return this.accountInfo('frontendOpenOrders', params, requestOptions);
  }

  async getFundingHistory(
    params: GetFundingHistoryRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info(
      'fundingHistory',
      {
        ...params,
        coin: await this.infoCoin(params.coin),
      },
      requestOptions,
    );
  }

  getGossipPriorityAuctionStatus(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('gossipPriorityAuctionStatus', {}, requestOptions);
  }

  getGossipRootIps(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('gossipRootIps', {}, requestOptions);
  }

  getOrderHistory(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('historicalOrders', params, requestOptions);
  }

  getVipStatus(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<boolean> {
    return this.accountInfo('isVip', params, requestOptions);
  }

  async getOrderBook(
    params: GetOrderBookRequest,
    requestOptions?: RequestOptions,
  ): Promise<OrderBookResponse | null> {
    return this.info(
      'l2Book',
      {
        ...params,
        coin: await this.infoCoin(params.coin),
      },
      requestOptions,
    );
  }

  getLeadingVaults(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('leadingVaults', params, requestOptions);
  }

  getLegalStatus(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('legalCheck', params, requestOptions);
  }

  getLiquidatablePositions(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('liquidatable', {}, requestOptions);
  }

  getMarginTable(
    params: { id: number },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('marginTable', params, requestOptions);
  }

  getMaxBuilderFee(
    params: GetMaxBuilderFeeRequest,
    requestOptions?: RequestOptions,
  ): Promise<number> {
    return this.accountInfo('maxBuilderFee', params, requestOptions);
  }

  getMaxMarketOrderNotionals(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('maxMarketOrderNtls', {}, requestOptions);
  }

  getPerpMetadata(
    params: { dex?: string } = {},
    requestOptions?: RequestOptions,
  ): Promise<PerpMeta> {
    return this.info('meta', params, requestOptions);
  }

  getPerpAssetContexts(
    params: { dex?: string } = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('metaAndAssetCtxs', params, requestOptions);
  }

  getOpenOrders(
    params: AccountDexRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<OpenOrder[]> {
    return this.accountInfo('openOrders', params, requestOptions);
  }

  getOrderStatus(
    params: GetOrderStatusRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('orderStatus', params, requestOptions);
  }

  getOutcomeMetadata(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('outcomeMeta', {}, requestOptions);
  }

  async getPerpAnnotation(
    params: { coin: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info(
      'perpAnnotation',
      { coin: await this.infoCoin(params.coin) },
      requestOptions,
    );
  }

  getPerpCategories(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('perpCategories', {}, requestOptions);
  }

  getConcisePerpAnnotations(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('perpConciseAnnotations', {}, requestOptions);
  }

  getPerpDeployAuctionStatus(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('perpDeployAuctionStatus', {}, requestOptions);
  }

  getPerpDexLimits(
    params: { dex: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('perpDexLimits', params, requestOptions);
  }

  getPerpDexStatus(
    params: { dex: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('perpDexStatus', params, requestOptions);
  }

  getPerpDexs(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('perpDexs', {}, requestOptions);
  }

  getPerpsAtOpenInterestCap(
    params: { dex?: string } = {},
    requestOptions?: RequestOptions,
  ): Promise<string[]> {
    return this.info('perpsAtOpenInterestCap', params, requestOptions);
  }

  getPortfolio(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('portfolio', params, requestOptions);
  }

  getPreTransferCheck(
    params: GetPreTransferCheckRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info(
      'preTransferCheck',
      normalizeAddresses(params),
      requestOptions,
    );
  }

  getPredictedFundingRates(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('predictedFundings', {}, requestOptions);
  }

  async getRecentTrades(
    params: { coin: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info(
      'recentTrades',
      { coin: await this.infoCoin(params.coin) },
      requestOptions,
    );
  }

  getReferralInfo(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('referral', params, requestOptions);
  }

  getSettledOutcome(
    params: { outcome: number },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('settledOutcome', params, requestOptions);
  }

  async getBalances(
    params: AccountDexRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<AccountBalancesResponse> {
    const user = await this.resolveAccountAddress(params.user, requestOptions);
    const [perp, spot] = await Promise.all([
      this.getPerpAccountSummary(
        {
          user,
          ...(params.dex === undefined ? {} : { dex: params.dex }),
        },
        requestOptions,
      ),
      this.getSpotBalances({ user }, requestOptions),
    ]);

    return { perp, spot, user };
  }

  getSpotBalances(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<SpotBalancesResponse> {
    return this.accountInfo('spotClearinghouseState', params, requestOptions);
  }

  getSpotDeployAuctionStatus(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('spotDeployState', params, requestOptions);
  }

  getSpotMetadata(requestOptions?: RequestOptions): Promise<SpotMeta> {
    return this.info('spotMeta', {}, requestOptions);
  }

  getSpotAssetContexts(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('spotMetaAndAssetCtxs', {}, requestOptions);
  }

  getSpotPairDeployAuctionStatus(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('spotPairDeployAuctionStatus', {}, requestOptions);
  }

  getSubAccounts(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('subAccounts', params, requestOptions);
  }

  getSubAccountsWithAllDexStates(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('subAccounts2', params, requestOptions);
  }

  getTokenDetails(
    params: { tokenId: string },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('tokenDetails', params, requestOptions);
  }

  getTwapHistory(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('twapHistory', params, requestOptions);
  }

  getUserAbstraction(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userAbstraction', params, requestOptions);
  }

  getUserBorrowLendInterest(
    params: GetUserBorrowLendInterestRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userBorrowLendInterest', params, requestOptions);
  }

  getUserDexAbstraction(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userDexAbstraction', params, requestOptions);
  }

  getUserFees(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userFees', params, requestOptions);
  }

  getUserFills(
    params: GetUserFillsRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<UserFill[]> {
    return this.accountInfo('userFills', params, requestOptions);
  }

  getUserFillsByTime(
    params: GetUserFillsByTimeRequest,
    requestOptions?: RequestOptions,
  ): Promise<UserFill[]> {
    return this.accountInfo('userFillsByTime', params, requestOptions);
  }

  getUserFundingHistory(
    params: GetUserFundingHistoryRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userFunding', params, requestOptions);
  }

  getUserNonFundingLedgerUpdates(
    params: GetUserNonFundingLedgerUpdatesRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo(
      'userNonFundingLedgerUpdates',
      params,
      requestOptions,
    );
  }

  getUserRateLimit(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userRateLimit', params, requestOptions);
  }

  getUserRole(
    params: UserRequest,
    requestOptions?: RequestOptions,
  ): Promise<UserRoleResponse> {
    return this.info('userRole', normalizeUserRequest(params), requestOptions);
  }

  getMultiSigSigners(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userToMultiSigSigners', params, requestOptions);
  }

  getUserTwapSliceFills(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userTwapSliceFills', params, requestOptions);
  }

  getUserTwapSliceFillsByTime(
    params: GetUserTwapSliceFillsByTimeRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userTwapSliceFillsByTime', params, requestOptions);
  }

  getUserVaultDeposits(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('userVaultEquities', params, requestOptions);
  }

  getValidatorL1Votes(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('validatorL1Votes', {}, requestOptions);
  }

  getValidatorSummaries(
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('validatorSummaries', {}, requestOptions);
  }

  getVaultDetails(
    params: GetVaultDetailsRequest,
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info(
      'vaultDetails',
      normalizeAddresses(params),
      requestOptions,
    );
  }

  getVaultSummaries(requestOptions?: RequestOptions): Promise<InfoResponse> {
    return this.info('vaultSummaries', {}, requestOptions);
  }

  getWebData2(
    params: AccountRequest = {},
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.accountInfo('webData2', params, requestOptions);
  }

  getAlignedQuoteTokenStatus(
    params: { token: number },
    requestOptions?: RequestOptions,
  ): Promise<InfoResponse> {
    return this.info('alignedQuoteTokenInfo', params, requestOptions);
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
    if (params.side !== 'buy' && params.side !== 'sell') {
      throw new TypeError('side must be "buy" or "sell".');
    }
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

    const dex =
      asset.kind === 'hip3' ? asset.canonicalName.split(':', 1)[0] : undefined;
    const mids = await this.getAllMids(dex ? { dex } : {}, options);
    const mid = mids[asset.canonicalName];
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

  async submitLimitOrder(
    params: SubmitLimitOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    if (params.side !== 'buy' && params.side !== 'sell') {
      throw new TypeError('side must be "buy" or "sell".');
    }
    if (
      params.timeInForce !== undefined &&
      params.timeInForce !== 'GTC' &&
      params.timeInForce !== 'IOC'
    ) {
      throw new TypeError('timeInForce must be "GTC" or "IOC".');
    }
    if (params.postOnly && params.timeInForce === 'IOC') {
      throw new TypeError(
        'postOnly cannot be combined with timeInForce "IOC".',
      );
    }

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
    this.referralAttempted = true;
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
      this.confirmBuilderFeeApproval();
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

  private async accountInfo<T>(
    type: string,
    params: InfoParams,
    requestOptions?: RequestOptions,
  ): Promise<T> {
    const { user: requestedUser, ...fields } = params as AccountRequest &
      Record<string, unknown>;
    const user = await this.resolveAccountAddress(
      requestedUser,
      requestOptions,
    );

    return this.info<T>(
      type,
      normalizeAddresses({ user, ...fields }),
      requestOptions,
    );
  }

  private async resolveAccountAddress(
    requestedUser?: string,
    requestOptions?: RequestOptions,
  ): Promise<string> {
    return this.accountResolver.resolveAccountAddress(
      requestedUser,
      requestOptions,
    );
  }

  private resolveSignerAccount(requestOptions?: RequestOptions) {
    return this.accountResolver.resolveSignerAccount(requestOptions);
  }

  private async infoCoin(coin: string): Promise<string> {
    return coin.includes('/')
      ? (await this.assetResolver.resolve(coin)).canonicalName
      : coin;
  }

  protected override async beforeActionSubmission(
    action: JsonObject,
    options: ActionSubmissionOptions,
  ): Promise<void> {
    const { type } = action;
    if (typeof type !== 'string' || !TRADING_ACTIONS.has(type)) {
      return;
    }

    const isMultiSig = 'multiSigUser' in options;
    if (isMultiSig) {
      const referralOptions = {
        multiSigUser: options.multiSigUser,
        signers: options.signers,
      };
      this.scheduleReferral(() =>
        this.submitMultiSigL1Action(
          {
            type: 'setReferrer',
            code: this.actionBuilder.partnerConfiguration().referralCode,
          },
          referralOptions,
        ),
      );
    } else {
      this.scheduleReferral(() => this.setReferrer());
    }

    if (type !== 'order') {
      return;
    }

    const resolveOwner = isMultiSig
      ? () =>
          Promise.resolve({
            address: normalizeAddresses(options.multiSigUser),
            canAutoApprove: false,
          })
      : this.actionBuilder.hasSigner()
        ? () => this.resolveBuilderApprovalOwner()
        : undefined;
    if (!resolveOwner) {
      return;
    }

    this.warnForBuilderApproval();
    if (this.builderApprovalState === 'approved') {
      return;
    }
    if (!this.builderApprovalPromise) {
      this.builderApprovalState = 'checking';
      this.builderApprovalPromise = this.checkBuilderApproval(resolveOwner);
    }
    await this.waitForBuilderApprovalCheck(this.builderApprovalPromise);
  }

  private async checkBuilderApproval(
    resolveOwner: () => Promise<BuilderApprovalOwner | undefined>,
  ): Promise<void> {
    let owner: BuilderApprovalOwner | undefined;
    try {
      owner = await resolveOwner();
      if (!owner) {
        this.builderApprovalState = 'unavailable';
      } else {
        const partner = this.actionBuilder.partnerConfiguration();
        const approvedFee = await this.getMaxBuilderFee({
          builder: partner.builder.b,
          user: owner.address,
        });
        if (
          !Number.isFinite(approvedFee) ||
          !Number.isInteger(approvedFee) ||
          approvedFee < 0
        ) {
          throw new TypeError(
            'Hyperliquid returned an invalid maxBuilderFee response.',
          );
        }
        if (this.builderApprovalState === 'approved') {
          return;
        }
        if (approvedFee >= partner.builder.f) {
          this.confirmBuilderFeeApproval();
          return;
        }
        this.builderApprovalState = 'unapproved';
      }
    } catch {
      if (this.builderApprovalState !== 'approved') {
        this.builderApprovalState = 'unavailable';
      }
    }

    if (this.builderApprovalState === 'unapproved' && owner?.canAutoApprove) {
      void this.approveBuilderFee()
        .then((response) => {
          if (response.status !== 'ok') {
            this.warnForBuilderApproval();
          }
        })
        .catch(() => {
          this.builderApprovalState = 'unapproved';
          this.warnForBuilderApproval();
        });
      return;
    }
    this.warnForBuilderApproval();
  }

  private confirmBuilderFeeApproval(): void {
    this.builderApprovalState = 'approved';
    this.actionBuilder.confirmBuilderFeeApproval();
  }

  private async resolveBuilderApprovalOwner(): Promise<
    BuilderApprovalOwner | undefined
  > {
    const resolution = await this.resolveSignerAccount();
    if (!resolution.role) {
      return {
        address: resolution.accountAddress,
        canAutoApprove:
          this.actionBuilder.usesPrivateKeySigner() &&
          resolution.accountAddress === resolution.signerAddress,
      };
    }

    const { role } = resolution;
    if (role.role === 'user') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: this.actionBuilder.usesPrivateKeySigner(),
      };
    }
    if (role.role === 'agent') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: false,
      };
    }
    if (role.role === 'subAccount') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: false,
      };
    }
    return undefined;
  }

  private waitForBuilderApprovalCheck(check: Promise<void>): Promise<void> {
    this.builderPreflightDeadline ??=
      Date.now() + BUILDER_APPROVAL_PREFLIGHT_BUDGET_MS;
    const remaining = this.builderPreflightDeadline - Date.now();
    if (remaining <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        resolve();
      };

      timer = setTimeout(finish, remaining);
      void check.then(finish);
    });
  }

  private scheduleReferral(submit: () => Promise<unknown>): void {
    if (this.referralAttempted) {
      return;
    }

    this.referralAttempted = true;
    queueMicrotask(() => {
      void submit().catch(() => undefined);
    });
  }

  private warnForBuilderApproval(): void {
    if (
      this.builderApprovalState !== 'unapproved' &&
      this.builderApprovalState !== 'unavailable'
    ) {
      return;
    }

    const status =
      this.builderApprovalState === 'unapproved'
        ? 'is missing or below the configured fee'
        : 'could not be verified';
    try {
      console.warn(
        `[@siebly/hyperliquid-api] Siebly builder approval ${status}. Orders are being submitted without a builder fee. Approve the builder from the main wallet with client.approveBuilderFee(). API wallets cannot grant this approval. A future major version may require approval before trading.`,
      );
    } catch {
      // A broken console must not stop an order.
    }
  }
}

export type { AssetIdentifier, Grouping, ModifyWireInput, OrderWireInput };
