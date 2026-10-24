export type InfoResponse =
  Record<string, unknown> | unknown[] | boolean | number | string | null;

export type AllMidsResponse = Record<string, string>;

export interface ExchangeStatus {
  specialStatuses: string | null;
  time: number;
}

export interface ExtraAgent {
  address: string;
  name: string;
  validUntil: number | null;
}

export type GossipPriorityAuctionStatus = [
  previousWinnerIps: Array<string | null>,
  auctions: DeployGasAuction[],
];

export interface LeadingVault {
  address: string;
  name: string;
}

export interface LegalStatus {
  acceptedTerms: boolean;
  restrictions: 'a' | 'n' | 'o' | 'u';
  userAllowed: boolean;
}

export interface LiquidatablePosition {
  marginAvailable: [number, number];
  /** Isolated positions are known; other position-index variants are undocumented. */
  positionIndex: {
    isolated?: { asset: number };
    [variant: string]: unknown;
  };
  user: string;
}

export type MaxMarketOrderNotional = [
  maxLeverage: number,
  maxMarketOrderNtl: string,
];

export interface PreTransferCheck {
  fee: string;
  isSanctioned: boolean;
  userExists: boolean;
  userHasSentTx: boolean;
}

export interface Trade {
  coin: string;
  hash: string;
  px: string;
  side: 'A' | 'B';
  sz: string;
  tid: number;
  time: number;
  users: [buyer: string, seller: string];
}

export interface MultiSigSigners {
  authorizedUsers: string[];
  threshold: number;
}

/** Documented response; the public API may reject this request type. */
export interface AlignedQuoteTokenStatus {
  dailyAmountOwed: Array<[date: string, amount: string]>;
  evmMintedSupply: string;
  firstAlignedTime: number | null;
  isAligned: boolean;
  predictedRate: string;
}

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
  cloid?: string | null;
  coin: string;
  limitPx: string;
  oid: number;
  origSz?: string;
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
  twapId?: number | null;
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
  | 'internalCancel'
  | 'iocCancelRejected'
  | 'liquidatedCanceled'
  | 'marginCanceled'
  | 'marketOrderNoLiquidityRejected'
  | 'minTradeNtlRejected'
  | 'open'
  | 'openInterestCapCanceled'
  | 'openInterestIncreaseRejected'
  | 'oracleRejected'
  | 'outcomeSettledCanceled'
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
  | 'tooManyOpenOrdersRejected'
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

export interface TwapState {
  coin: string;
  executedNtl: string;
  executedSz: string;
  minutes: number;
  randomize: boolean;
  reduceOnly: boolean;
  side: 'A' | 'B';
  stopPx?: string | null;
  sz: string;
  timestamp: number;
  trigger?: { above: boolean; px: string } | null;
  user: string;
}

export type TwapStatus =
  | {
      status:
        | 'activated'
        | 'finished'
        | 'stopped'
        | 'terminated'
        | 'waitingForTrigger';
    }
  | { description: string; status: 'error' };

export interface TwapHistoryEntry {
  state: TwapState;
  status: TwapStatus;
  time: number;
  twapId?: number;
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

export interface SubAccountWithAllDexStates {
  abstraction?: Exclude<UserAbstraction, 'default'>;
  dexToClearinghouseState: Array<
    [dex: string, state: PerpAccountSummaryResponse]
  >;
  master: string;
  name: string;
  spotState: SpotBalancesResponse;
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
  relationship: VaultRelationship;
  vaultAddress: string;
}

export type VaultRelationship =
  | { data: { childAddresses: string[] }; type: 'parent' }
  | { type: 'child' | 'normal' };

export interface VaultSummary {
  createTimeMillis: number;
  isClosed: boolean;
  leader: string;
  name: string;
  relationship: VaultRelationship;
  tvl: string;
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
  | { stage: 'needToCreateCode' }
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
  rewardHistory: ReferralReward[];
  tokenToState: Array<[token: number, state: ReferralTokenState]>;
  unclaimedRewards: string;
}

export interface ReferralReward {
  earned: string;
  referralVlm: string;
  time: number;
  vlm: string;
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
  /** Non-null trial payloads have no documented schema. */
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

export type StakingHistoryDelta =
  | {
      cDeposit: {
        amount: string;
      };
    }
  | {
      delegate: {
        amount: string;
        isUndelegate: boolean;
        validator: string;
      };
    }
  | {
      withdrawal: {
        amount: string;
        phase: string;
      };
    };

export interface StakingHistoryEntry {
  delta: StakingHistoryDelta;
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

export interface UserBorrowLendInterest {
  borrow: string;
  supply: string;
  time: number;
  token: string;
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

/** Non-funding ledger entries, shared by Info and WebSocket history. */
export type UserNonFundingLedgerDelta =
  | { toPerp: boolean; type: 'accountClassTransfer'; usdc: string }
  | { type: 'deposit'; usdc: string }
  | { fee: string; nonce: number; type: 'withdraw'; usdc: string }
  | {
      destination: string;
      fee: string;
      type: 'internalTransfer';
      usdc: string;
      user: string;
    }
  | {
      destination: string;
      type: 'subAccountTransfer';
      usdc: string;
      user: string;
    }
  | {
      accountValue: string;
      leverageType: 'Cross' | 'Isolated';
      liquidatedNtlPos?: string;
      liquidatedPositions: Array<{ coin: string; szi: string }>;
      type: 'liquidation';
    }
  | { amount: string; token?: string; type: 'rewardsClaim' }
  | {
      amount: string;
      destination: string;
      fee: string;
      feeToken?: string;
      nativeTokenFee?: string;
      nonce?: number | null;
      token: string;
      type: 'spotTransfer';
      usdcValue: string;
      user: string;
    }
  | { fee?: string; type: 'vaultCreate'; usdc: string; vault: string }
  | { type: 'vaultDeposit' | 'vaultDistribution'; usdc: string; vault: string }
  | {
      basis: string;
      closingCost: string;
      commission: string;
      netWithdrawnUsd: string;
      requestedUsd: string;
      type: 'vaultWithdraw';
      user: string;
      vault: string;
    }
  | { type: 'vaultLeaderCommission'; usdc: string; user: string }
  | {
      amount: string;
      destination: string;
      destinationDex: string;
      fee: string;
      feeToken: string;
      nativeTokenFee: string;
      nonce: number;
      sourceDex: string;
      token: string;
      type: 'send';
      usdcValue: string;
      user: string;
    }
  | { amount: string; token: string; type: 'deployGasAuction' | 'spotGenesis' }
  | {
      amount: string;
      isDeposit: boolean;
      token: string;
      type: 'cStakingTransfer';
    }
  | {
      amount: string;
      interestAmount: string;
      operation: 'borrow' | 'repay' | 'supply' | 'withdraw';
      token: string;
      type: 'borrowLend';
    }
  | {
      amount: string;
      dex: string;
      token: string;
      type: 'activateDexAbstraction';
    };

export interface UserNonFundingLedgerUpdate {
  delta: UserNonFundingLedgerDelta;
  hash: string;
  time: number;
}

export interface PredictedFundingQuote {
  fundingIntervalHours?: number;
  fundingRate: string;
  nextFundingTime: number;
}

export type PredictedFunding = [
  coin: string,
  venues: Array<[venue: string, quote: PredictedFundingQuote | null]>,
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
  displayName?: string;
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
  deployGas: string | null;
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

export interface ValidatorStats {
  nSamples: number;
  predictedApr: string;
  uptimeFraction: string;
}

export interface ValidatorSummary {
  commission: string;
  description: string;
  isActive: boolean;
  isJailed: boolean;
  name: string;
  nRecentBlocks: number;
  signer: string;
  /** Wire number; large stakes can exceed JavaScript's safe integer range. */
  stake: number;
  stats: Array<[period: 'day' | 'month' | 'week', stats: ValidatorStats]>;
  unjailableAfter: number | null;
  validator: string;
}

export type OutcomeGovernanceAction =
  | {
      registerTokensAndStandaloneOutcome: {
        nameAndDescription: [string, string];
        quoteToken: number;
      };
    }
  | {
      registerTokensAndQuestion: {
        fallbackNameAndDescription: [string, string];
        namedOutcomes: Array<[string, string]>;
        questionNameAndDescription: [string, string];
        quoteToken: number;
      };
    }
  | {
      registerTemplate: {
        id: string;
        keywordToHint: Array<
          [keyword: string, hint: 'date' | 'dateTime' | 'hlPerp' | 'string']
        >;
        nameAndDescription: [string, string];
        role: { standaloneOutcome: { sideNames: [string, string] } };
      };
    }
  | {
      settleOutcome: {
        details: string;
        outcome: number;
        settleFraction: string;
      };
    }
  | {
      settleQuestion: {
        question: number;
        settleFractionsAndDetails: Array<
          [outcome: number, fractionAndDetails: [string, string]]
        >;
      };
    }
  | {
      settleQuestion2: {
        nameAndDescription: [string, string];
        outcomeSettlements: Array<{
          details: string;
          nameAndDescription: [string, string];
          outcome: number;
          settleFraction: string;
          sideNames: [string, string];
        }>;
        question: number;
      };
    };

export type ValidatorL1VoteAction =
  | { C: string[] }
  | { D: string }
  | {
      E: {
        evmRebalanceContract: string;
        technicalStaker: string;
        token: number;
        treasuryEvmAddress: string;
        treasuryStaker: string;
      };
    }
  | { O: OutcomeGovernanceAction };

export interface ValidatorL1Vote {
  action: ValidatorL1VoteAction;
  expireTime: number;
  quorumReached: boolean;
  votes: string[];
}

export interface WebData2 {
  agentAddress: string | null;
  agentValidUntil: number | null;
  assetCtxs: PerpAssetContext[];
  clearinghouseState: PerpAccountSummaryResponse;
  cumLedger: string;
  isVault: boolean;
  leadingVaults: LeadingVault[];
  meta: PerpMeta;
  openOrders: FrontendOpenOrder[];
  optOutOfSpotDusting?: true;
  perpsAtOpenInterestCap?: string[];
  serverTime: number;
  spotAssetCtxs: SpotAssetContext[];
  spotState?: SpotBalancesResponse;
  totalVaultEquity: string;
  twapStates: Array<[twapId: number, state: TwapState]>;
  user: string;
}
