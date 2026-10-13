import type {
  ActiveAssetData,
  Candle,
  HistoricalOrder,
  LeadingVault,
  OpenOrder,
  OrderBookResponse,
  OrderState,
  PerpAccountSummaryResponse,
  PerpAssetContext,
  SpotAssetContext,
  SpotBalancesResponse,
  Trade,
  TwapHistoryEntry,
  TwapSliceFill,
  TwapState,
  UserFill,
  UserNonFundingLedgerUpdate,
} from '../response/info.types.js';

export type CandleInterval =
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
  | '6h'
  | '8h'
  | '1w';

export type UserSubscriptionType =
  | 'activeAssetData'
  | 'allDexsClearinghouseState'
  | 'clearinghouseState'
  | 'notification'
  | 'openOrders'
  | 'orderUpdates'
  | 'spotState'
  | 'twapStates'
  | 'userEvents'
  | 'userFills'
  | 'userFundings'
  | 'userHistoricalOrders'
  | 'userNonFundingLedgerUpdates'
  | 'userTwapHistory'
  | 'userTwapSliceFills'
  | 'webData3';

export type WebsocketSubscription =
  | { dex?: string; type: 'allMids' }
  | { dex?: string; type: 'assetCtxs' }
  | { coin: string; type: 'activeAssetCtx' }
  | { coin: string; user: string; type: 'activeAssetData' }
  | { type: 'allDexsAssetCtxs' }
  | { user: string; type: 'allDexsClearinghouseState' }
  | { coin: string; type: 'bbo' }
  | { coin: string; interval: CandleInterval; type: 'candle' }
  | { dex?: string; user: string; type: 'clearinghouseState' }
  | { type: 'fastAssetCtxs' }
  | {
      coin: string;
      fast?: boolean;
      mantissa?: 1 | 2 | 5 | null;
      nSigFigs?: 2 | 3 | 4 | 5 | null;
      type: 'l2Book';
    }
  | { user: string; type: 'notification' }
  | { dex?: string; user: string; type: 'openOrders' }
  | { user: string; type: 'orderUpdates' }
  | { type: 'outcomeMetaUpdates' }
  | { type: 'spotAssetCtxs' }
  | {
      ignorePortfolioMargin?: boolean;
      isPortfolioMargin?: never;
      user: string;
      type: 'spotState';
    }
  | {
      ignorePortfolioMargin?: never;
      isPortfolioMargin?: boolean;
      user: string;
      type: 'spotState';
    }
  | { coin: string; type: 'trades' }
  | { dex?: string; user: string; type: 'twapStates' }
  | { user: string; type: 'userEvents' }
  | { aggregateByTime?: boolean; user: string; type: 'userFills' }
  | { user: string; type: 'userFundings' }
  | { user: string; type: 'userHistoricalOrders' }
  | { user: string; type: 'userNonFundingLedgerUpdates' }
  | { user: string; type: 'userTwapHistory' }
  | { user: string; type: 'userTwapSliceFills' }
  | { user: string; type: 'webData3' };

export interface AllMidsEvent {
  dex?: string;
  mids: Record<string, string>;
}

export interface AssetContextEvent {
  coin: string;
  ctx: PerpAssetContext | SpotAssetContext;
}

export interface ActivePerpAssetContextEvent extends AssetContextEvent {
  ctx: PerpAssetContext;
}

export interface ActiveSpotAssetContextEvent extends AssetContextEvent {
  ctx: SpotAssetContext;
}

export interface AssetCtxsEvent {
  ctxs: PerpAssetContext[];
  dex: string;
}

export interface AllDexsAssetCtxsEvent {
  ctxs: Array<[dex: string, contexts: PerpAssetContext[]]>;
}

export interface ClearinghouseStateEvent {
  clearinghouseState: PerpAccountSummaryResponse;
  dex: string;
  user: string;
}

export interface AllDexsClearinghouseStateEvent {
  clearinghouseStates: Array<[dex: string, state: PerpAccountSummaryResponse]>;
  user: string;
}

export type ActiveAssetDataEvent = ActiveAssetData;

export interface BboEvent {
  bbo: [
    bid: { n: number; px: string; sz: string } | null,
    offer: { n: number; px: string; sz: string } | null,
  ];
  coin: string;
  time: number;
}

export type TradeEvent = Trade;

export interface NotificationEvent {
  notification: string;
}

export interface OrderUpdateEvent {
  order: OpenOrder;
  status: OrderState;
  statusTimestamp: number;
}

export interface FastAssetCtxsEvent {
  [coin: string]: {
    markPx?: string;
    midPx?: string | null;
  };
}

export type SpotAssetCtxsEvent = SpotAssetContext[];

export interface OutcomeMetaUpdatesEvent {
  updates: Array<
    | {
        outcomeCreated: {
          description: string;
          name: string;
          outcome: number;
          quoteToken: string;
          sideSpecs: Array<{ name: string; token?: number }>;
        };
      }
    | { outcomeSettled: { outcome: number } }
    | {
        questionUpdated: {
          description: string;
          fallbackOutcome: number;
          name: string;
          namedOutcomes: number[];
          question: number;
          settledNamedOutcomes: number[];
        };
      }
    | { questionSettled: { question: number } }
  >;
}

export interface UserFillsEvent {
  fills: UserFill[];
  isSnapshot?: boolean;
  user: string;
}

export interface OpenOrdersEvent {
  dex: string;
  orders: OpenOrder[];
  user: string;
}

export interface UserFundingsEvent {
  fundings: Array<{
    coin: string;
    fundingRate: string;
    nSamples: number | null;
    szi: string;
    time: number;
    usdc: string;
  }>;
  isSnapshot?: boolean;
  user: string;
}

export interface UserHistoricalOrdersEvent {
  isSnapshot?: boolean;
  orderHistory: HistoricalOrder[];
  user: string;
}

export interface UserNonFundingLedgerUpdatesEvent {
  isSnapshot?: boolean;
  nonFundingLedgerUpdates: UserNonFundingLedgerUpdate[];
  user: string;
}

export interface UserTwapHistoryEvent {
  history: TwapHistoryEntry[];
  isSnapshot?: boolean;
  user: string;
}

export interface UserTwapSliceFillsEvent {
  isSnapshot?: boolean;
  twapSliceFills: TwapSliceFill[];
  user: string;
}

export interface SpotStateEvent {
  spotState: SpotBalancesResponse;
  user: string;
}

export interface TwapStatesEvent {
  dex: string;
  states: Array<[twapId: number, state: TwapState]>;
  user: string;
}

export type UserEvent =
  | { fills: UserFill[] }
  | {
      funding: {
        coin: string;
        fundingRate: string;
        nSamples: number | null;
        szi: string;
        time: number;
        usdc: string;
      };
    }
  | {
      liquidation: {
        lid: number;
        liquidated_account_value: string;
        liquidated_ntl_pos: string;
        liquidated_user: string;
        liquidator: string;
      };
    }
  | { nonUserCancel: Array<{ coin: string; oid: number }> }
  | { twapHistory: TwapHistoryEntry[] }
  | { twapSliceFills: TwapSliceFill[] };

export interface WebData3PerpDexState {
  leadingVaults?: LeadingVault[];
  perpsAtOpenInterestCap?: string[];
  totalVaultEquity: string;
}

export interface WebData3Event {
  perpDexStates: WebData3PerpDexState[];
  userState: {
    abstraction?: 'disabled' | 'portfolioMargin' | 'unifiedAccount';
    agentAddress: string | null;
    agentValidUntil: number | null;
    cumLedger: string;
    dexAbstractionEnabled?: boolean;
    isVault: boolean;
    optOutOfSpotDusting?: true;
    serverTime: number;
    user: string;
  };
}

export type GenericWebsocketEvent =
  Record<string, unknown> | unknown[] | string | number | boolean | null;

/** Payload types keyed by subscription type. Wire envelopes are defined in ws-events. */
export interface WebsocketSubscriptionData {
  activeAssetCtx: AssetContextEvent;
  activeAssetData: ActiveAssetDataEvent;
  allDexsAssetCtxs: AllDexsAssetCtxsEvent;
  allDexsClearinghouseState: AllDexsClearinghouseStateEvent;
  allMids: AllMidsEvent;
  assetCtxs: AssetCtxsEvent;
  bbo: BboEvent;
  candle: Candle;
  clearinghouseState: ClearinghouseStateEvent;
  fastAssetCtxs: FastAssetCtxsEvent;
  l2Book: OrderBookResponse;
  notification: NotificationEvent;
  openOrders: OpenOrdersEvent;
  orderUpdates: OrderUpdateEvent[];
  outcomeMetaUpdates: OutcomeMetaUpdatesEvent;
  spotAssetCtxs: SpotAssetCtxsEvent;
  spotState: SpotStateEvent;
  trades: TradeEvent[];
  twapStates: TwapStatesEvent;
  userEvents: UserEvent;
  userFills: UserFillsEvent;
  userFundings: UserFundingsEvent;
  userHistoricalOrders: UserHistoricalOrdersEvent;
  userNonFundingLedgerUpdates: UserNonFundingLedgerUpdatesEvent;
  userTwapHistory: UserTwapHistoryEvent;
  userTwapSliceFills: UserTwapSliceFillsEvent;
  webData3: WebData3Event;
}

export type WebsocketEventFor<S extends WebsocketSubscription> =
  WebsocketSubscriptionData[S['type']];
