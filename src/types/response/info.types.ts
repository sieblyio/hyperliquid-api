export type InfoResponse =
  Record<string, unknown> | unknown[] | boolean | number | string | null;

export type AllMidsResponse = Record<string, string>;

export type UserRoleResponse =
  | { role: 'agent'; data: { user: string } }
  | { role: 'missing' | 'user' | 'vault' }
  | { role: 'subAccount'; data: { master: string } };

export interface OrderBookLevel {
  n: number;
  px: string;
  sz: string;
}

export interface OrderBookResponse {
  coin: string;
  fast?: true;
  levels: [OrderBookLevel[], OrderBookLevel[]];
  spread?: string;
  time: number;
}

export interface Candle {
  T: number;
  c: string;
  h: string;
  i:
    | '1d'
    | '12h'
    | '15m'
    | '1h'
    | '1m'
    | '1M'
    | '2h'
    | '30m'
    | '3d'
    | '3m'
    | '4h'
    | '5m'
    | '8h'
    | '1w';
  l: string;
  n: number;
  o: string;
  s: string;
  t: number;
  v: string;
}

export interface OpenOrder {
  coin: string;
  limitPx: string;
  oid: number;
  origSz: string;
  side: 'A' | 'B';
  sz: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface SpotBalance {
  coin: string;
  entryNtl: string;
  hold: string;
  token: number;
  total: string;
}

export interface SpotBalancesResponse {
  balances: SpotBalance[];
  tokenToAvailableAfterMaintenance?: Array<[token: number, available: string]>;
}

export interface PerpMarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

export interface PerpCumulativeFunding {
  allTime: string;
  sinceChange: string;
  sinceOpen: string;
}

export interface PerpCrossLeverage {
  type: 'cross';
  value: number;
}

export interface PerpIsolatedLeverage {
  rawUsd: string;
  type: 'isolated';
  value: number;
}

export type PerpLeverage = PerpCrossLeverage | PerpIsolatedLeverage;

export interface PerpPosition {
  coin: string;
  cumFunding: PerpCumulativeFunding;
  entryPx: string | null;
  leverage: PerpLeverage;
  liquidationPx: string | null;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface PerpAssetPosition {
  position: PerpPosition;
  type: 'oneWay';
}

export interface PerpAccountSummaryResponse {
  assetPositions: PerpAssetPosition[];
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: PerpMarginSummary;
  marginSummary: PerpMarginSummary;
  time: number;
  withdrawable: string;
}

export interface AccountBalancesResponse {
  perp: PerpAccountSummaryResponse;
  spot: SpotBalancesResponse;
  user: string;
}

export interface UserFill {
  builderFee?: string;
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  fee: string;
  feeToken: string;
  hash: string;
  oid: number;
  px: string;
  side: 'A' | 'B';
  startPosition: string;
  sz: string;
  time: number;
  tid: number;
  [key: string]: unknown;
}

export interface FrontendOpenOrder {
  children?: FrontendOpenOrder[];
  cloid?: string | null;
  coin: string;
  isPositionTpsl: boolean;
  isTrigger: boolean;
  limitPx: string;
  oid: number;
  orderType: string;
  origSz: string;
  reduceOnly: boolean;
  side: 'A' | 'B';
  sz: string;
  tif?: string | null;
  timestamp: number;
  triggerCondition: string;
  triggerPx: string;
}

export type OrderState =
  | 'badAloPxRejected'
  | 'badTriggerPxRejected'
  | 'canceled'
  | 'delistedCanceled'
  | 'filled'
  | 'insufficientSpotBalanceRejected'
  | 'iocCancelRejected'
  | 'liquidatedCanceled'
  | 'marginCanceled'
  | 'marketOrderNoLiquidityRejected'
  | 'minTradeNtlRejected'
  | 'open'
  | 'openInterestCapCanceled'
  | 'openInterestIncreaseRejected'
  | 'oracleRejected'
  | 'perpMarginRejected'
  | 'perpMaxPositionRejected'
  | 'positionFlipAtOpenInterestCapRejected'
  | 'positionIncreaseAtOpenInterestCapRejected'
  | 'reduceOnlyCanceled'
  | 'reduceOnlyRejected'
  | 'rejected'
  | 'scheduledCancel'
  | 'selfTradeCanceled'
  | 'siblingFilledCanceled'
  | 'tickRejected'
  | 'tooAggressiveAtOpenInterestCapRejected'
  | 'triggered'
  | 'vaultWithdrawalCanceled';

export interface OrderStatusDetails {
  order: FrontendOpenOrder;
  status: OrderState;
  statusTimestamp: number;
}

export type OrderStatusResponse =
  { order: OrderStatusDetails; status: 'order' } | { status: 'unknownOid' };

export interface HistoricalOrder {
  order: FrontendOpenOrder;
  status: OrderState;
  statusTimestamp: number;
}

export interface UserRateLimit {
  cumVlm: string;
  nRequestsCap: number;
  nRequestsSurplus: number;
  nRequestsUsed: number;
}

export interface TwapSliceFill {
  fill: UserFill;
  twapId: number;
}

export interface SubAccount {
  clearinghouseState: PerpAccountSummaryResponse;
  master: string;
  name: string;
  spotState: {
    balances: SpotBalance[];
  };
  subAccountUser: string;
}

export type PortfolioPeriod =
  | 'allTime'
  | 'day'
  | 'month'
  | 'perpAllTime'
  | 'perpDay'
  | 'perpMonth'
  | 'perpWeek'
  | 'week';

export interface PortfolioSnapshot {
  accountValueHistory: Array<[time: number, value: string]>;
  pnlHistory: Array<[time: number, value: string]>;
  vlm: string;
}

export type PortfolioEntry = [
  period: PortfolioPeriod,
  snapshot: PortfolioSnapshot,
];

export interface VaultFollower {
  allTimePnl: string;
  daysFollowing: number;
  lockupUntil: number;
  pnl: string;
  user: string;
  vaultEntryTime: number;
  vaultEquity: string;
}

export interface VaultDetails {
  allowDeposits: boolean;
  alwaysCloseOnWithdraw: boolean;
  apr: number;
  description: string;
  followerState: VaultFollower | null;
  followers: VaultFollower[];
  isClosed: boolean;
  leader: string;
  leaderCommission: number;
  leaderFraction: number;
  maxDistributable: number;
  maxWithdrawable: number;
  name: string;
  portfolio: PortfolioEntry[];
  relationship: {
    data: { childAddresses: string[] };
    type: 'parent';
  };
  vaultAddress: string;
}

export interface UserVaultDeposit {
  equity: string;
  vaultAddress: string;
}

export interface ReferralTokenState {
  builderRewards: string;
  claimedRewards: string;
  cumVlm: string;
  unclaimedRewards: string;
}

export interface ReferralUser {
  cumFeesRewardedToReferrer: string;
  cumRewardedFeesSinceReferred: string;
  cumVlm: string;
  timeJoined: number;
  user: string;
}

export type ReferrerState =
  | {
      data: { code: string; referralStates: ReferralUser[] };
      stage: 'ready';
    }
  | {
      data: { required: string };
      stage: 'needToTrade';
    };

export interface ReferralInfo {
  builderRewards: string;
  claimedRewards: string;
  cumVlm: string;
  referredBy: { code: string; referrer: string } | null;
  referrerState: ReferrerState;
  rewardHistory: unknown[];
  tokenToState: Array<[token: number, state: ReferralTokenState]>;
  unclaimedRewards: string;
}

export interface UserDailyVolume {
  date: string;
  exchange: string;
  userAdd: string;
  userCross: string;
}

export interface UserFeeTier {
  add: string;
  cross?: string;
  makerFractionCutoff?: string;
  ntlCutoff?: string;
  spotAdd?: string;
  spotCross?: string;
}

export interface StakingDiscountTier {
  bpsOfMaxSupply: string;
  discount: string;
}

export interface UserFees {
  activeReferralDiscount: string;
  activeStakingDiscount: StakingDiscountTier;
  dailyUserVlm: UserDailyVolume[];
  feeSchedule: {
    add: string;
    cross: string;
    referralDiscount: string;
    spotAdd: string;
    spotCross: string;
    stakingDiscountTiers: StakingDiscountTier[];
    tiers: {
      mm: UserFeeTier[];
      vip: UserFeeTier[];
    };
  };
  feeTrialEscrow?: string;
  feeTrialReward?: string;
  nextTrialAvailableTimestamp: number | null;
  stakingLink: { stakingUser: string; type: 'tradingUser' } | null;
  trial: unknown;
  userAddRate: string;
  userCrossRate: string;
  userSpotAddRate: string;
  userSpotCrossRate: string;
}

export interface StakingDelegation {
  amount: string;
  lockedUntilTimestamp: number;
  validator: string;
}

export interface StakingSummary {
  delegated: string;
  nPendingWithdrawals: number;
  totalPendingWithdrawal: string;
  undelegated: string;
}

export interface StakingHistoryEntry {
  delta: {
    delegate: {
      amount: string;
      isUndelegate: boolean;
      validator: string;
    };
  };
  hash: string;
  time: number;
}

export interface StakingReward {
  source: string;
  time: number;
  totalAmount: string;
}

export type UserAbstraction =
  | 'default'
  | 'dexAbstraction'
  | 'disabled'
  | 'portfolioMargin'
  | 'unifiedAccount';

export interface BorrowLendBalance {
  basis: string;
  value: string;
}

export interface BorrowLendTokenState {
  borrow: BorrowLendBalance;
  supply: BorrowLendBalance;
}

export interface BorrowLendUserState {
  health: string;
  healthFactor: string | null;
  tokenToState: Array<[token: number, state: BorrowLendTokenState]>;
}

export interface BorrowLendReserveState {
  balance: string;
  borrowYearlyRate: string;
  ltv: string;
  oraclePx: string;
  supplyYearlyRate: string;
  totalBorrowed: string;
  totalSupplied: string;
  utilization: string;
}

export type BorrowLendReserveEntry = [
  token: number,
  state: BorrowLendReserveState,
];

export interface PerpAsset {
  deployerFeeScale?: string;
  growthMode?: 'enabled';
  isDelisted?: boolean;
  lastFeeScaleChangeTime?: string;
  /**
   * "strictIsolated" means margin cannot be removed.
   * "noCross" means only isolated margin is allowed.
   */
  marginMode?: 'noCross' | 'strictIsolated';
  marginTableId: number;
  maxLeverage: number;
  name: string;
  /** Deprecated. True for both "strictIsolated" and "noCross". */
  onlyIsolated?: boolean;
  szDecimals: number;
}

export interface PerpMarginTier {
  lowerBound: string;
  maxLeverage: number;
}

export interface PerpMarginTable {
  description: string;
  marginTiers: PerpMarginTier[];
}

export interface PerpMeta {
  collateralToken: number;
  marginTables: Array<[id: number, table: PerpMarginTable]>;
  universe: PerpAsset[];
}

export interface PerpAssetContext {
  dayBaseVlm: string;
  dayNtlVlm: string;
  funding: string;
  impactPxs: [string, string] | null;
  markPx: string;
  midPx: string | null;
  openInterest: string;
  oraclePx: string;
  premium: string | null;
  prevDayPx: string;
}

export type PerpMetaAndAssetContexts = [
  meta: PerpMeta,
  contexts: PerpAssetContext[],
];

export interface PerpDex {
  assetToFundingClamp: Array<[coin: string, clamp: string]>;
  assetToFundingInterestRate: Array<[coin: string, interestRate: string]>;
  assetToFundingMultiplier: Array<[coin: string, multiplier: string]>;
  assetToStreamingOiCap: Array<[coin: string, openInterestCap: string]>;
  deployer: string;
  feeRecipient: string | null;
  fullName: string;
  name: string;
  oracleUpdater: string | null;
  subDeployers: Array<[role: string, users: string[]]>;
}

export interface FundingHistory {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export interface UserFundingDelta {
  coin: string;
  fundingRate: string;
  nSamples: number | null;
  szi: string;
  type: 'funding';
  usdc: string;
}

export interface UserFunding {
  delta: UserFundingDelta;
  hash: string;
  time: number;
}

/**
 * Non-funding ledger delta. Which fields are present depends on `type`
 * (deposit, withdraw, transfer, staking, deploy auction, and others).
 */
export interface UserNonFundingLedgerDelta {
  amount?: string;
  destination?: string;
  destinationDex?: string;
  fee?: string;
  feeToken?: string;
  isDeposit?: boolean;
  nativeTokenFee?: string;
  nonce?: number;
  sourceDex?: string;
  token?: string;
  type: string;
  usdc?: string;
  usdcValue?: string;
  user?: string;
}

export interface UserNonFundingLedgerUpdate {
  delta: UserNonFundingLedgerDelta;
  hash: string;
  time: number;
}

export interface PredictedFundingQuote {
  fundingRate: string;
  nextFundingTime: number;
}

export type PredictedFunding = [
  coin: string,
  venues: Array<[venue: string, quote: PredictedFundingQuote]>,
];

export interface DeployGasAuction {
  currentGas: string | null;
  durationSeconds: number;
  endGas: string | null;
  startGas: string;
  startTimeSeconds: number;
}

export type PerpDeployAuctionStatus = DeployGasAuction;

export interface ActiveAssetData {
  availableToTrade: [string, string];
  coin: string;
  leverage: PerpLeverage;
  markPx: string;
  maxTradeSzs: [string, string];
  user: string;
}

export interface PerpDexLimits {
  coinToOiCap: Array<[coin: string, openInterestCap: string]>;
  maxTransferNtl: string;
  oiSzCapPerPerp: string;
  totalOiCap: string;
}

export interface PerpDexStatus {
  totalNetDeposit: string;
}

export interface PerpAnnotation {
  category: string;
  description: string;
  displayName?: string;
  keywords?: string[];
}

export type PerpCategory = [coin: string, category: string];

export interface PerpConciseAnnotationInfo {
  category: string;
  keywords?: string[];
}

export type PerpConciseAnnotation = [
  coin: string,
  annotation: PerpConciseAnnotationInfo,
];

export interface SpotEvmContract {
  address: string;
  evm_extra_wei_decimals: number;
}

export interface SpotToken {
  deployerTradingFeeShare: string;
  evmContract: SpotEvmContract | null;
  fullName: string | null;
  index: number;
  isCanonical: boolean;
  name: string;
  szDecimals: number;
  tokenId: string;
  weiDecimals: number;
}

export interface SpotPair {
  index: number;
  isCanonical: boolean;
  name: string;
  tokens: [base: number, quote: number];
}

export interface SpotMeta {
  tokens: SpotToken[];
  universe: SpotPair[];
}

export interface SpotAssetContext {
  circulatingSupply: string;
  coin: string;
  dayBaseVlm: string;
  dayNtlVlm: string;
  markPx: string;
  midPx: string | null;
  prevDayPx: string;
  totalSupply: string;
}

export type SpotMetaAndAssetContexts = [
  meta: SpotMeta,
  contexts: SpotAssetContext[],
];

export interface SpotDeployTokenSpec {
  name: string;
  szDecimals: number;
  weiDecimals: number;
}

export interface SpotDeployTokenState {
  existingTokenGenesisBalances: Array<[token: number, amount: string]>;
  fullName: string;
  hyperliquidityGenesisBalance: string;
  maxSupply: number;
  spec: SpotDeployTokenSpec;
  spots: number[];
  token: number;
  totalGenesisBalanceWei: string;
  userGenesisBalances: Array<[user: string, amount: string]>;
}

export interface SpotDeployStateResponse {
  gasAuction: DeployGasAuction;
  states: SpotDeployTokenState[];
}

export type SpotPairDeployAuctionStatus = DeployGasAuction;

export interface TokenGenesis {
  blacklistUsers: string[];
  existingTokenBalances: Array<[token: number, amount: string]>;
  userBalances: Array<[user: string, amount: string]>;
}

export interface TokenDetails {
  circulatingSupply: string;
  deployGas: string;
  deployTime: string | null;
  deployer: string | null;
  futureEmissions: string;
  genesis: TokenGenesis | null;
  markPx: string;
  maxSupply: string;
  midPx: string;
  name: string;
  nonCirculatingUserBalances: Array<[user: string, amount: string]>;
  prevDayPx: string;
  seededUsdc: string;
  szDecimals: number;
  totalSupply: string;
  weiDecimals: number;
}

export interface OutcomeSideSpec {
  name: string;
}

export interface Outcome {
  deployerFeeScale?: string;
  description: string;
  name: string;
  outcome: number;
  quoteToken: string;
  sideSpecs: OutcomeSideSpec[];
  venue?: string;
}

export interface OutcomeQuestion {
  description: string;
  fallbackOutcome: number;
  name: string;
  namedOutcomes: number[];
  question: number;
  settledNamedOutcomes: number[];
}

export interface OutcomeDeployer {
  deployer: string;
  subDeployers: Array<[role: string, users: string[]]>;
  venue: string;
}

export interface OutcomeMetadata {
  deployers: OutcomeDeployer[];
  feeScale: string;
  outcomes: Outcome[];
  questions: OutcomeQuestion[];
}

export interface SettledOutcomeQuestion {
  description: string;
  name: string;
  question: {
    settled: number;
  };
}

export interface SettledOutcome {
  details: string;
  question?: SettledOutcomeQuestion;
  settleFraction: string;
  spec: Outcome;
}

export interface OutcomeDeployerLimits {
  nActiveOutcomesRemaining: number;
  nDailyOutcomesRemaining: number;
}
