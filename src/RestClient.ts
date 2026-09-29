import { MAINNET_API_URL, TESTNET_API_URL } from './constants.js';
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
  CancelResponseData,
  ExchangeDefaultResponse,
  ExchangeResponse,
  OrderResponseData,
  TwapCancelResponseData,
  TwapOrderResponseData,
} from './types/response/exchange.types.js';
import type {
  AccountBalancesResponse,
  ActiveAssetData,
  AllMidsResponse,
  BorrowLendReserveEntry,
  BorrowLendReserveState,
  BorrowLendUserState,
  Candle,
  FrontendOpenOrder,
  FundingHistory,
  HistoricalOrder,
  InfoResponse,
  OpenOrder,
  OrderBookResponse,
  OrderStatusResponse,
  OutcomeDeployerLimits,
  OutcomeMetadata,
  PerpAccountSummaryResponse,
  PerpAnnotation,
  PerpCategory,
  PerpConciseAnnotation,
  PerpDeployAuctionStatus,
  PerpDex,
  PerpDexLimits,
  PerpDexStatus,
  PerpMeta,
  PerpMetaAndAssetContexts,
  PortfolioEntry,
  PredictedFunding,
  ReferralInfo,
  SettledOutcome,
  SpotBalancesResponse,
  SpotDeployStateResponse,
  SpotMeta,
  SpotMetaAndAssetContexts,
  SpotPairDeployAuctionStatus,
  StakingDelegation,
  StakingHistoryEntry,
  StakingReward,
  StakingSummary,
  SubAccount,
  TokenDetails,
  TwapSliceFill,
  UserAbstraction,
  UserFees,
  UserFill,
  UserFunding,
  UserNonFundingLedgerUpdate,
  UserRateLimit,
  UserRoleResponse,
  UserVaultDeposit,
  VaultDetails,
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

export class RestClient extends BaseRestClient {
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

  /**
   * Mid prices for all coins (`allMids`).
   *
   * An empty book falls back to the last trade price. Spot mids are included
   * only when `dex` is omitted or empty.
   */
  getAllMids(params: { dex?: string } = {}): Promise<AllMidsResponse> {
    return this.info('allMids', params);
  }

  /**
   * User's active asset data (`activeAssetData`): leverage, max trade size,
   * available to trade, and mark price for one coin.
   */
  getActiveAssetData(
    params: AccountRequest & { coin: string },
  ): Promise<ActiveAssetData> {
    return this.accountInfo('activeAssetData', params);
  }

  /**
   * Borrow and lend reserve state for every token (`allBorrowLendReserveStates`).
   *
   * Each entry is `[token, reserve]`.
   */
  getAllBorrowLendReserveStates(): Promise<BorrowLendReserveEntry[]> {
    return this.info('allBorrowLendReserveStates', {});
  }

  /**
   * Metadata for every perp DEX (`allPerpMetas`).
   *
   * Each entry is one DEX: universe, margin tables, and collateral token.
   * Index 0 is the default perp DEX.
   */
  getAllPerpMetadata(): Promise<PerpMeta[]> {
    return this.info('allPerpMetas', {});
  }

  /**
   * Builder addresses this user has approved (`approvedBuilders`).
   */
  getApprovedBuilders(params: AccountRequest = {}): Promise<string[]> {
    return this.accountInfo('approvedBuilders', params);
  }

  /**
   * Borrow and lend reserve state for one token (`borrowLendReserveState`).
   */
  getBorrowLendReserveState(params: {
    token: number;
  }): Promise<BorrowLendReserveState> {
    return this.info('borrowLendReserveState', params);
  }

  /**
   * User borrow and lend balances (`borrowLendUserState`).
   *
   * `tokenToState` entries are `[token, state]`.
   */
  getUserBorrowLendState(
    params: AccountRequest = {},
  ): Promise<BorrowLendUserState> {
    return this.accountInfo('borrowLendUserState', params);
  }

  /**
   * Candle snapshot (`candleSnapshot`).
   *
   * Only the most recent 5000 candles are available. HIP-3 coins use a
   * `dex:COIN` name.
   */
  async getCandles(params: GetCandlesRequest): Promise<Candle[]> {
    return this.info('candleSnapshot', {
      req: { ...params, coin: await this.nameToCoin(params.coin) },
    });
  }

  /**
   * Perp account summary (`clearinghouseState`): open positions and margin.
   *
   * `assetPositions[].position.szi` is signed: positive is long, negative is short.
   * Under unified account or portfolio margin, use spot balances for the
   * trading account balance across spot and perps.
   */
  getPerpAccountSummary(
    params: AccountDexRequest = {},
  ): Promise<PerpAccountSummaryResponse> {
    return this.accountInfo('clearinghouseState', params);
  }

  /**
   * Stake delegated to validators (`delegations`).
   */
  getStakingDelegations(
    params: AccountRequest = {},
  ): Promise<StakingDelegation[]> {
    return this.accountInfo('delegations', params);
  }

  /**
   * Staking history (`delegatorHistory`).
   *
   * The documented delta is a delegation or undelegation.
   */
  getStakingHistory(
    params: AccountRequest = {},
  ): Promise<StakingHistoryEntry[]> {
    return this.accountInfo('delegatorHistory', params);
  }

  /**
   * Staking rewards (`delegatorRewards`).
   *
   * `source` is `"delegation"` or `"commission"` in the documented samples.
   */
  getStakingRewards(params: AccountRequest = {}): Promise<StakingReward[]> {
    return this.accountInfo('delegatorRewards', params);
  }

  /**
   * Staking summary (`delegatorSummary`): delegated, undelegated, and pending withdrawals.
   */
  getStakingSummary(params: AccountRequest = {}): Promise<StakingSummary> {
    return this.accountInfo('delegatorSummary', params);
  }

  getExchangeStatus(): Promise<InfoResponse> {
    return this.info('exchangeStatus', {});
  }

  getExtraAgents(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('extraAgents', params);
  }

  /**
   * Open orders with trigger and reduce-only fields (`frontendOpenOrders`).
   *
   * Spot orders are included only for the first perp DEX.
   */
  getFrontendOpenOrders(
    params: AccountDexRequest = {},
  ): Promise<FrontendOpenOrder[]> {
    return this.accountInfo('frontendOpenOrders', params);
  }

  /**
   * Historical funding rates for one coin (`fundingHistory`).
   */
  async getFundingHistory(
    params: GetFundingHistoryRequest,
  ): Promise<FundingHistory[]> {
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

  /**
   * Recent historical orders (`historicalOrders`).
   *
   * Returns at most 2000 orders. `status` uses the same values as `getOrderStatus()`.
   */
  getOrderHistory(params: AccountRequest = {}): Promise<HistoricalOrder[]> {
    return this.accountInfo('historicalOrders', params);
  }

  getVipStatus(params: AccountRequest = {}): Promise<boolean> {
    return this.accountInfo('isVip', params);
  }

  /**
   * L2 order book (`l2Book`).
   *
   * At most 20 levels per side. `nSigFigs` aggregates prices. `mantissa` is
   * only valid when `nSigFigs` is 5.
   */
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

  /**
   * Maximum approved builder fee (`maxBuilderFee`).
   *
   * The number is in tenths of a basis point. `1` means 0.001%.
   */
  getMaxBuilderFee(params: GetMaxBuilderFeeRequest): Promise<number> {
    return this.accountInfo('maxBuilderFee', params);
  }

  getMaxMarketOrderNotionals(): Promise<InfoResponse> {
    return this.info('maxMarketOrderNtls', {});
  }

  /**
   * Perp metadata (`meta`): universe and margin tables.
   *
   * `dex` defaults to the empty string, which is the first perp DEX.
   */
  getPerpMetadata(params: { dex?: string } = {}): Promise<PerpMeta> {
    return this.info('meta', params);
  }

  /**
   * Perp metadata plus asset contexts (`metaAndAssetCtxs`).
   *
   * The tuple is `[meta, contexts]`. Contexts line up with `meta.universe`
   * and include mark price, funding, open interest, and related fields.
   * `dex` defaults to the empty string, which is the first perp DEX.
   */
  getPerpAssetContexts(
    params: { dex?: string } = {},
  ): Promise<PerpMetaAndAssetContexts> {
    return this.info('metaAndAssetCtxs', params);
  }

  /**
   * Open orders (`openOrders`).
   *
   * Spot orders are included only for the first perp DEX. `side` `"B"` is bid
   * and `"A"` is ask.
   */
  getOpenOrders(params: AccountDexRequest = {}): Promise<OpenOrder[]> {
    return this.accountInfo('openOrders', params);
  }

  /**
   * Order status by order id or client order id (`orderStatus`).
   *
   * `status: "unknownOid"` means the order was not found. Otherwise
   * `status` is `"order"` and `order.status` is the order state.
   */
  getOrderStatus(params: GetOrderStatusRequest): Promise<OrderStatusResponse> {
    return this.accountInfo('orderStatus', params);
  }

  /**
   * Outcome metadata (`outcomeMeta`): outcomes, questions, and deployers.
   */
  getOutcomeMetadata(): Promise<OutcomeMetadata> {
    return this.info('outcomeMeta', {});
  }

  /**
   * Remaining outcome deployment allowance for a venue (`outcomeDeployerLimits`).
   *
   * `venue` is the venue name, for example `"out"`.
   */
  getOutcomeDeployerLimits(params: {
    venue: string;
  }): Promise<OutcomeDeployerLimits> {
    return this.info('outcomeDeployerLimits', params);
  }

  /**
   * Perp annotation for one coin (`perpAnnotation`).
   *
   * Returns `null` when the coin has no annotation.
   */
  getPerpAnnotation(params: { coin: string }): Promise<PerpAnnotation | null> {
    return this.info('perpAnnotation', params);
  }

  /**
   * Perp category for each listed coin (`perpCategories`).
   *
   * Each entry is `[coin, category]`.
   */
  getPerpCategories(): Promise<PerpCategory[]> {
    return this.info('perpCategories', {});
  }

  /**
   * Concise perp annotations (`perpConciseAnnotations`).
   *
   * Each entry is `[coin, annotation]`. `keywords` is omitted when absent.
   */
  getConcisePerpAnnotations(): Promise<PerpConciseAnnotation[]> {
    return this.info('perpConciseAnnotations', {});
  }

  /**
   * Perp deploy auction status (`perpDeployAuctionStatus`).
   */
  getPerpDeployAuctionStatus(): Promise<PerpDeployAuctionStatus> {
    return this.info('perpDeployAuctionStatus', {});
  }

  /**
   * Builder-deployed perp market limits (`perpDexLimits`).
   *
   * `dex` is required. The empty string is not allowed.
   */
  getPerpDexLimits(params: { dex: string }): Promise<PerpDexLimits> {
    return this.info('perpDexLimits', params);
  }

  /**
   * Perp DEX deposit status (`perpDexStatus`).
   *
   * The empty string is the first perp DEX.
   */
  getPerpDexStatus(params: { dex: string }): Promise<PerpDexStatus> {
    return this.info('perpDexStatus', params);
  }

  /**
   * All perpetual DEXs (`perpDexs`).
   *
   * Index 0 is `null`, the default perp DEX. Later entries are
   * builder-deployed HIP-3 DEXs.
   */
  getPerpDexs(): Promise<Array<PerpDex | null>> {
    return this.info('perpDexs', {});
  }

  /**
   * Coins currently at their open-interest cap (`perpsAtOpenInterestCap`).
   *
   * `dex` selects a builder-deployed market. Omitted means the first perp DEX.
   */
  getPerpsAtOpenInterestCap(params: { dex?: string } = {}): Promise<string[]> {
    return this.info('perpsAtOpenInterestCap', params);
  }

  /**
   * Account value, PnL, and volume history (`portfolio`).
   *
   * Each entry is `[period, snapshot]`. Periods include `day`, `week`,
   * `month`, `allTime`, and the `perp*` variants.
   */
  getPortfolio(params: AccountRequest = {}): Promise<PortfolioEntry[]> {
    return this.accountInfo('portfolio', params);
  }

  getPreTransferCheck(
    params: GetPreTransferCheckRequest,
  ): Promise<InfoResponse> {
    return this.info('preTransferCheck', normalizeAddresses(params));
  }

  /**
   * Predicted funding rates by venue (`predictedFundings`).
   *
   * Only the first perp DEX is supported. Each entry is `[coin, venues]`,
   * and each venue is `[venue, quote]`, for example `"HlPerp"`.
   */
  getPredictedFundingRates(): Promise<PredictedFunding[]> {
    return this.info('predictedFundings', {});
  }

  getRecentTrades(params: { coin: string }): Promise<InfoResponse> {
    return this.info('recentTrades', params);
  }

  /**
   * Referral state (`referral`).
   *
   * `referredBy` is `null` when the user was not referred. `referrerState.stage`
   * is `"ready"` or `"needToTrade"`. Claimed rewards now also appear in the
   * non-funding ledger. `rewardHistory` is legacy.
   */
  getReferralInfo(params: AccountRequest = {}): Promise<ReferralInfo> {
    return this.accountInfo('referral', params);
  }

  /**
   * Settled outcome (`settledOutcome`).
   *
   * Returns `null` when the outcome is still unsettled.
   */
  getSettledOutcome(params: {
    outcome: number;
  }): Promise<SettledOutcome | null> {
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

  /**
   * Spot token balances (`spotClearinghouseState`).
   *
   * Under unified account or portfolio margin, this is the trading-account
   * balance across spot and perps.
   */
  getSpotBalances(params: AccountRequest = {}): Promise<SpotBalancesResponse> {
    return this.accountInfo('spotClearinghouseState', params);
  }

  /**
   * Spot deploy state for a user (`spotDeployState`), including the gas auction.
   */
  getSpotDeployAuctionStatus(
    params: AccountRequest = {},
  ): Promise<SpotDeployStateResponse> {
    return this.accountInfo('spotDeployState', params);
  }

  /**
   * Spot metadata (`spotMeta`): tokens and trading pairs.
   */
  getSpotMetadata(): Promise<SpotMeta> {
    return this.info('spotMeta', {});
  }

  /**
   * Spot metadata plus asset contexts (`spotMetaAndAssetCtxs`).
   *
   * The tuple is `[meta, contexts]`. Contexts include mark price, volume,
   * and supply. `midPx` is `null` when there is no mid.
   */
  getSpotAssetContexts(): Promise<SpotMetaAndAssetContexts> {
    return this.info('spotMetaAndAssetCtxs', {});
  }

  /**
   * Dutch auction for deploying a spot pair (`spotPairDeployAuctionStatus`).
   */
  getSpotPairDeployAuctionStatus(): Promise<SpotPairDeployAuctionStatus> {
    return this.info('spotPairDeployAuctionStatus', {});
  }

  /**
   * Subaccounts of a master (`subAccounts`).
   *
   * Returns `null` when the address has no subaccounts.
   */
  getSubAccounts(params: AccountRequest = {}): Promise<SubAccount[] | null> {
    return this.accountInfo('subAccounts', params);
  }

  getSubAccountsWithAllDexStates(
    params: AccountRequest = {},
  ): Promise<InfoResponse> {
    return this.accountInfo('subAccounts2', params);
  }

  /**
   * Token details (`tokenDetails`): supply, prices, and genesis balances.
   *
   * `tokenId` is the 34-character onchain id, for example
   * `0x00000000000000000000000000000000`.
   */
  getTokenDetails(params: { tokenId: string }): Promise<TokenDetails> {
    return this.info('tokenDetails', params);
  }

  getTwapHistory(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('twapHistory', params);
  }

  /**
   * Account abstraction mode (`userAbstraction`).
   */
  getUserAbstraction(params: AccountRequest = {}): Promise<UserAbstraction> {
    return this.accountInfo('userAbstraction', params);
  }

  getUserBorrowLendInterest(
    params: GetUserBorrowLendInterestRequest,
  ): Promise<InfoResponse> {
    return this.accountInfo('userBorrowLendInterest', params);
  }

  /**
   * Whether HIP-3 DEX abstraction is enabled (`userDexAbstraction`).
   */
  getUserDexAbstraction(params: AccountRequest = {}): Promise<boolean> {
    return this.accountInfo('userDexAbstraction', params);
  }

  /**
   * User fee rates and the current fee schedule (`userFees`).
   */
  getUserFees(params: AccountRequest = {}): Promise<UserFees> {
    return this.accountInfo('userFees', params);
  }

  /**
   * Recent fills (`userFills`).
   *
   * Returns at most 2000 fills. `builderFee` is omitted when it is zero.
   * `side` `"B"` is buy and `"A"` is sell.
   */
  getUserFills(params: GetUserFillsRequest = {}): Promise<UserFill[]> {
    return this.accountInfo('userFills', params);
  }

  /**
   * Fills in a time range (`userFillsByTime`).
   *
   * Returns at most 2000 fills, and only the 10000 most recent fills are available.
   * Paginate by using the last `time` as the next `startTime`.
   */
  getUserFillsByTime(params: GetUserFillsByTimeRequest): Promise<UserFill[]> {
    return this.accountInfo('userFillsByTime', params);
  }

  /**
   * User funding payments (`userFunding`).
   *
   * `startTime` is inclusive, in milliseconds. `endTime` defaults to now.
   */
  getUserFundingHistory(
    params: GetUserFundingHistoryRequest = {},
  ): Promise<UserFunding[]> {
    return this.accountInfo('userFunding', params);
  }

  /**
   * User non-funding ledger updates (`userNonFundingLedgerUpdates`):
   * deposits, withdrawals, transfers, and other account events.
   *
   * `startTime` is inclusive, in milliseconds. `endTime` defaults to now.
   * Read `delta.type` to see which delta fields are set.
   */
  getUserNonFundingLedgerUpdates(
    params: GetUserNonFundingLedgerUpdatesRequest = {},
  ): Promise<UserNonFundingLedgerUpdate[]> {
    return this.accountInfo('userNonFundingLedgerUpdates', params);
  }

  /**
   * Address request usage and cap (`userRateLimit`).
   *
   * `nRequestsUsed` is usage above the reserved amount.
   * `nRequestsSurplus` is reserved amount not yet used.
   */
  getUserRateLimit(params: AccountRequest = {}): Promise<UserRateLimit> {
    return this.accountInfo('userRateLimit', params);
  }

  /**
   * Account role (`userRole`): user, agent, vault, subaccount, or missing.
   *
   * Query the master or subaccount address itself. An agent wallet address
   * returns the agent role, not the trading account.
   */
  getUserRole(params: UserRequest): Promise<UserRoleResponse> {
    return this.info('userRole', normalizeUserRequest(params));
  }

  getMultiSigSigners(params: AccountRequest = {}): Promise<InfoResponse> {
    return this.accountInfo('userToMultiSigSigners', params);
  }

  /**
   * Recent TWAP slice fills (`userTwapSliceFills`).
   *
   * Returns at most 2000 fills. TWAP fill hashes are zero.
   */
  getUserTwapSliceFills(params: AccountRequest = {}): Promise<TwapSliceFill[]> {
    return this.accountInfo('userTwapSliceFills', params);
  }

  getUserTwapSliceFillsByTime(
    params: GetUserTwapSliceFillsByTimeRequest,
  ): Promise<InfoResponse> {
    return this.accountInfo('userTwapSliceFillsByTime', params);
  }

  /**
   * Vault equity for this user (`userVaultEquities`).
   */
  getUserVaultDeposits(
    params: AccountRequest = {},
  ): Promise<UserVaultDeposit[]> {
    return this.accountInfo('userVaultEquities', params);
  }

  getValidatorL1Votes(): Promise<InfoResponse> {
    return this.info('validatorL1Votes', {});
  }

  getValidatorSummaries(): Promise<InfoResponse> {
    return this.info('validatorSummaries', {});
  }

  /**
   * Vault details (`vaultDetails`).
   *
   * Pass `user` to include that address in `followerState`.
   */
  getVaultDetails(params: GetVaultDetailsRequest): Promise<VaultDetails> {
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

  /**
   * Place one or more orders (`order`).
   *
   * Each status is `resting`, `filled`, or `error`. The request can succeed
   * while an individual order is rejected.
   */
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

  /**
   * Place an IOC order around the current mid (`order`).
   *
   * `maxSlippage` is a fraction from 0 inclusive to 1 exclusive. The default is 0.05.
   */
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

  /**
   * Close a perp position with a reduce-only IOC order (`order`).
   *
   * Size defaults to the open position size.
   */
  async submitMarketClose(
    params: SubmitMarketCloseRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    const asset = await this.resolveAsset(params.symbol);
    const dex = hip3Dex(asset.canonicalName);
    const summary = await this.getPerpAccountSummary(dex ? { dex } : {});
    const requested =
      typeof params.symbol === 'string' ? params.symbol : asset.canonicalName;
    const assetPosition = summary.assetPositions.find(
      (entry) =>
        entry.position.coin === asset.canonicalName ||
        entry.position.coin === requested,
    );
    if (!assetPosition) {
      throw new TypeError(`No perpetual position found for "${requested}".`);
    }

    const { szi } = assetPosition.position;
    const size = params.size ?? (szi.startsWith('-') ? szi.slice(1) : szi);

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
        side: szi.startsWith('-') ? 'buy' : 'sell',
        size,
        symbol: params.symbol,
      },
      options,
    );
  }

  /**
   * Place a limit order (`order`).
   *
   * `postOnly` sends ALO. `timeInForce: "IOC"` sends IOC. Otherwise the order is GTC.
   */
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

  /**
   * Modify one resting order (`modify`).
   *
   * Statuses match `submitOrder()`. `alwaysPlace` sends `a: true` so the new
   * order is placed even when the cancel fails. `false` is omitted, because
   * hashing `a: false` is rejected.
   */
  async modifyOrder(
    params: ModifyOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.modify(params, params.alwaysPlace),
      options,
    );
  }

  /**
   * Modify multiple resting orders (`batchModify`).
   *
   * Statuses match `submitOrder()`. `alwaysPlace` has the same meaning as
   * on `modifyOrder()`.
   */
  async modifyOrders(
    params: ModifyOrdersRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<OrderResponseData>> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.batchModify(
        params.modifies,
        params.alwaysPlace,
      ),
      options,
    );
  }

  /**
   * Cancel orders by order id (`cancel`).
   *
   * Each status is `"success"` or `{ error }`. `fastCancel` sends `f: true`.
   * Trigger orders are rejected when fast cancel is set. `false` is omitted.
   */
  async cancelOrders(
    params: CancelOrdersRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<CancelResponseData>> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.cancel(
        params.cancels,
        params.fastCancel,
      ),
      options,
    );
  }

  /**
   * Cancel orders by client order id (`cancelByCloid`).
   *
   * Statuses match `cancelOrders()`. `fastCancel` has the same meaning.
   */
  async cancelOrdersByClientOrderId(
    params: CancelOrdersByClientOrderIdRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<CancelResponseData>> {
    return this.submitRawL1Action(
      await this.actionBuilder.actions.cancelByCloid(
        params.cancels,
        params.fastCancel,
      ),
      options,
    );
  }

  /**
   * Set cross or isolated leverage for one asset (`updateLeverage`).
   */
  updateLeverage(
    params: UpdateLeverageRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Add or remove isolated margin (`updateIsolatedMargin`).
   *
   * `ntli` is a 6-decimal integer. `1000000` is 1 USD.
   */
  updateIsolatedMargin(
    params: UpdateIsolatedMarginRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1('updateIsolatedMargin', params, options);
  }

  /**
   * Set isolated margin to a target leverage (`topUpIsolatedOnlyMargin`).
   *
   * This changes leverage directly. `updateIsolatedMargin()` changes a USDC amount.
   */
  setIsolatedMarginLeverage(
    params: SetIsolatedMarginLeverageRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1(
      'topUpIsolatedOnlyMargin',
      { ...params, leverage: decimalToWire(params.leverage) },
      options,
    );
  }

  /**
   * Place a TWAP order (`twapOrder`).
   *
   * A running TWAP returns `{ running: { twapId } }`. A rejected TWAP returns `{ error }`.
   */
  submitTwapOrder(
    params: SubmitTwapOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<TwapOrderResponseData>> {
    return this.l1('twapOrder', { twap: params }, options);
  }

  /**
   * Cancel a TWAP order (`twapCancel`).
   *
   * `status` is `"success"` or `{ error }`.
   */
  cancelTwapOrder(
    params: CancelTwapOrderRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse<TwapCancelResponseData>> {
    return this.l1('twapCancel', params, options);
  }

  /**
   * Schedule a cancel-all, or clear one (`scheduleCancel`).
   *
   * `time` is a millisecond timestamp at least 5 seconds in the future.
   * Omit `time` to remove the scheduled cancel. At most 10 triggers per day.
   */
  setCancelAllAfter(
    params: { time?: number } = {},
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1('scheduleCancel', params, options);
  }

  setReferrer(options: L1RequestOptions = {}): Promise<ExchangeResponse> {
    this.markReferralAttempted();
    const { referralCode } = this.actionBuilder.partnerConfiguration();
    return this.l1('setReferrer', { code: referralCode }, options);
  }

  registerReferrer(
    params: { code: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeResponse> {
    return this.l1('registerReferrer', params, options);
  }

  /**
   * Approve the configured builder fee (`approveBuilderFee`).
   *
   * `maxFeeRate` is a percent string such as `"0.001%"`.
   */
  async approveBuilderFee(
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    const partner = this.actionBuilder.partnerConfiguration();
    const response = await this.userSigned<ExchangeDefaultResponse>(
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

  /**
   * Approve an API wallet (`approveAgent`).
   *
   * An account can have one unnamed agent and up to three named agents.
   * Append `valid_until {timestamp}` to the name to set an expiration,
   * at most 180 days ahead.
   */
  approveApiWallet(
    params: ApproveApiWalletRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Send USDC to another address on HyperCore (`usdSend`).
   *
   * This does not touch the EVM bridge. `expiresAfter` is not supported.
   */
  sendUsd(
    params: SendUsdRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'usdSend',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.usdSend,
      options,
    );
  }

  /**
   * Send a spot token to another address on HyperCore (`spotSend`).
   *
   * This does not touch the EVM bridge. `token` is `name:tokenId`.
   */
  sendSpotAsset(
    params: SendSpotAssetRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'spotSend',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.spotSend,
      options,
    );
  }

  /**
   * Start a USDC withdrawal to the bridge (`withdraw3`).
   */
  withdrawUsd(
    params: WithdrawUsdRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'withdraw3',
      { ...params, amount: decimalToWire(params.amount), time: 0 },
      USER_SIGNED_ACTIONS.withdraw,
      options,
    );
  }

  /**
   * Move USDC between spot and perp (`usdClassTransfer`).
   *
   * `toPerp: true` sends spot to perp.
   */
  transferUsdBetweenSpotAndPerp(
    params: TransferUsdBetweenSpotAndPerpRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'usdClassTransfer',
      { ...params, amount: decimalOrSubaccountAmount(params.amount) },
      USER_SIGNED_ACTIONS.usdClassTransfer,
      options,
    );
  }

  /**
   * Transfer collateral between perp DEXs, spot, users, or subaccounts (`sendAsset`).
   *
   * Use `""` for the default USDC perp DEX and `"spot"` for spot.
   * Only the collateral token can move to or from a perp DEX.
   */
  sendAsset(
    params: SendAssetRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Send tokens from Core to EVM with calldata (`sendToEvmWithData`).
   *
   * The linked contract must implement `coreReceiveWithData`.
   */
  sendToEvmWithData(
    params: SendToEvmWithDataRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'sendToEvmWithData',
      { ...params, amount: decimalToWire(params.amount) },
      USER_SIGNED_ACTIONS.sendToEvmWithData,
      options,
    );
  }

  /**
   * Transfer collateral with an API wallet (`agentSendAsset`).
   *
   * Destination must match the source address. Dex names match `sendAsset()`.
   */
  sendAssetFromApiWallet(
    params: SendAssetFromApiWalletRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Move native token from spot into staking (`cDeposit`).
   *
   * `wei` is the amount in wei.
   */
  depositIntoStaking(
    params: { wei: number },
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'cDeposit',
      params,
      USER_SIGNED_ACTIONS.cDeposit,
      options,
    );
  }

  /**
   * Move native token from staking back to spot (`cWithdraw`).
   *
   * The transfer waits in a 7-day unstaking queue.
   */
  withdrawFromStaking(
    params: { wei: number },
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'cWithdraw',
      params,
      USER_SIGNED_ACTIONS.cWithdraw,
      options,
    );
  }

  /**
   * Delegate or undelegate stake to a validator (`tokenDelegate`).
   *
   * A delegation to one validator locks for 1 day.
   */
  delegateOrUndelegateStake(
    params: DelegateOrUndelegateStakeRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Set account abstraction (`userSetAbstraction`).
   *
   * `abstraction` is `"disabled"`, `"unifiedAccount"`, or `"portfolioMargin"`.
   */
  setUserAbstraction(
    params: SetUserAbstractionRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'userSetAbstraction',
      params,
      USER_SIGNED_ACTIONS.userSetAbstraction,
      options,
    );
  }

  /**
   * Enable or disable HIP-3 DEX abstraction (`userDexAbstraction`).
   *
   * Deprecated. Prefer `setUserAbstraction()`.
   */
  setUserDexAbstraction(
    params: UserToggleRequest,
    options: UserSignedRequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.userSigned(
      'userDexAbstraction',
      params,
      USER_SIGNED_ACTIONS.userDexAbstraction,
      options,
    );
  }

  /**
   * Enable HIP-3 DEX abstraction from an API wallet (`agentEnableDexAbstraction`).
   *
   * Deprecated. Prefer `setApiWalletAbstraction()`. This only changes `null` to enabled.
   */
  enableApiWalletDexAbstraction(
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1('agentEnableDexAbstraction', {}, options);
  }

  /**
   * Set account abstraction from an API wallet (`agentSetAbstraction`).
   *
   * `"i"` is disabled, `"u"` is unified account, and `"p"` is portfolio margin.
   */
  setApiWalletAbstraction(
    params: { abstraction: 'i' | 'p' | 'u' },
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Claim rewards (`claimRewards`).
   */
  claimRewards(
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Deposit or withdraw from an HIP-3 backstop liquidator (`hip3LiquidatorTransfer`).
   *
   * `ntl` is an integer in 1e-6 quote-token units and must be a multiple of
   * 1000 quote tokens. Only principal can be withdrawn, not PnL.
   */
  transferHip3LiquidatorFunds(
    params: { dex: string; isDeposit: boolean; ntl: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1('hip3LiquidatorTransfer', params, options);
  }

  /**
   * Mark a nonce as used without another effect (`noop`).
   */
  invalidateNonce(
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Buy extra address request weight (`reserveRequestWeight`).
   *
   * Each reserved action costs 0.0005 USDC from the perp balance.
   */
  reserveAdditionalActions(
    params: { weight: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Deposit or withdraw vault funds (`vaultTransfer`).
   */
  transferVaultFunds(
    params: TransferVaultFundsRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Vote the risk-free rate for an aligned quote asset (`validatorL1Stream`).
   *
   * `riskFreeRate` is a decimal string such as `"0.04"` for 4%.
   */
  updateValidatorL1Stream(
    params: { riskFreeRate: string },
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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

  /**
   * Authorize an AQAv2 role (`authorizeAqav2Role`).
   *
   * `token` is the token index, for example `0` for USDC.
   * `role` is `"technical"` or `"treasury"`.
   */
  authorizeAqav2Role(
    params: { role: 'technical' | 'treasury'; token: number },
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
    return this.l1('authorizeAqav2Role', params, options);
  }

  /**
   * Split, merge, or negate outcome shares (`userOutcome`).
   *
   * `splitOutcome` turns quote tokens into Yes and No shares.
   * `mergeOutcome` and `mergeQuestion` turn shares back into quote tokens.
   * `amount: null` merges the maximum. `negateOutcome` converts No shares
   * into Yes shares of the other outcomes on the same question.
   */
  submitUserOutcome(
    params: SubmitUserOutcomeRequest,
    options: L1RequestOptions = {},
  ): Promise<ExchangeDefaultResponse> {
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
