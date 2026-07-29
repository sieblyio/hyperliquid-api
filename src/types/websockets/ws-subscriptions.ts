import type {
  Candle,
  OpenOrder,
  OrderBookResponse,
  UserFill,
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
  coin?: string;
  ctx?: Record<string, unknown>;
  dex?: string;
  [key: string]: unknown;
}

export interface AssetCtxsEvent {
  ctxs: Record<string, unknown>[];
  dex: string;
}

export interface AllDexsAssetCtxsEvent {
  ctxs: Array<[dex: string, contexts: Record<string, unknown>[]]>;
}

export interface ClearinghouseStateEvent {
  clearinghouseState: Record<string, unknown>;
  dex: string;
  user: string;
}

export interface AllDexsClearinghouseStateEvent {
  clearinghouseStates: Array<[dex: string, state: Record<string, unknown>]>;
  user: string;
}

export interface ActiveAssetDataEvent {
  availableToTrade: [string, string];
  coin: string;
  leverage: Record<string, unknown>;
  maxTradeSzs: [string, string];
  user: string;
  [key: string]: unknown;
}

export interface BboEvent {
  bbo: [
    bid: { n: number; px: string; sz: string } | null,
    offer: { n: number; px: string; sz: string } | null,
  ];
  coin: string;
  time: number;
}

export interface TradeEvent {
  coin: string;
  hash: string;
  px: string;
  side: 'A' | 'B';
  sz: string;
  tid: number;
  time: number;
  users: [string, string];
}

export interface NotificationEvent {
  notification: string;
}

export interface OrderUpdateEvent {
  order: OpenOrder;
  status: string;
  statusTimestamp: number;
}

export interface FastAssetCtxsEvent {
  [coin: string]: {
    markPx?: string;
    midPx?: string | null;
  };
}

export type SpotAssetCtxsEvent = Array<Record<string, unknown>>;

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
  isSnapshot?: true;
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
  isSnapshot?: true;
  user: string;
}

export interface UserHistoricalOrdersEvent {
  isSnapshot?: true;
  orderHistory: unknown[];
  user: string;
}

export interface UserNonFundingLedgerUpdatesEvent {
  isSnapshot?: true;
  nonFundingLedgerUpdates: unknown[];
  user: string;
}

export interface UserTwapHistoryEvent {
  history: unknown[];
  isSnapshot?: true;
  user: string;
}

export interface UserTwapSliceFillsEvent {
  isSnapshot?: true;
  twapSliceFills: unknown[];
  user: string;
}

export interface SpotStateEvent {
  spotState: Record<string, unknown>;
  user: string;
}

export interface TwapStatesEvent {
  dex: string;
  states: Array<[twapId: number, state: Record<string, unknown>]>;
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
  | { twapHistory: unknown[] }
  | { twapSliceFills: unknown[] };

export interface WebData3Event {
  perpDexStates: Record<string, unknown>[];
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
  [key: string]: unknown;
}

export type GenericWebsocketEvent =
  Record<string, unknown> | unknown[] | string | number | boolean | null;

export type WebsocketEventFor<S extends WebsocketSubscription> =
  S['type'] extends 'allMids'
    ? AllMidsEvent
    : S['type'] extends 'activeAssetData'
      ? ActiveAssetDataEvent
      : S['type'] extends 'allDexsAssetCtxs'
        ? AllDexsAssetCtxsEvent
        : S['type'] extends 'allDexsClearinghouseState'
          ? AllDexsClearinghouseStateEvent
          : S['type'] extends 'assetCtxs'
            ? AssetCtxsEvent
            : S['type'] extends 'clearinghouseState'
              ? ClearinghouseStateEvent
              : S['type'] extends 'notification'
                ? NotificationEvent
                : S['type'] extends 'orderUpdates'
                  ? OrderUpdateEvent[]
                  : S['type'] extends 'spotState'
                    ? SpotStateEvent
                    : S['type'] extends 'trades'
                      ? TradeEvent[]
                      : S['type'] extends 'twapStates'
                        ? TwapStatesEvent
                        : S['type'] extends 'userEvents'
                          ? UserEvent
                          : S['type'] extends 'userFundings'
                            ? UserFundingsEvent
                            : S['type'] extends 'userHistoricalOrders'
                              ? UserHistoricalOrdersEvent
                              : S['type'] extends 'userNonFundingLedgerUpdates'
                                ? UserNonFundingLedgerUpdatesEvent
                                : S['type'] extends 'userTwapHistory'
                                  ? UserTwapHistoryEvent
                                  : S['type'] extends 'userTwapSliceFills'
                                    ? UserTwapSliceFillsEvent
                                    : S['type'] extends 'webData3'
                                      ? WebData3Event
                                      : S['type'] extends 'bbo'
                                        ? BboEvent
                                        : S['type'] extends 'candle'
                                          ? Candle
                                          : S['type'] extends 'fastAssetCtxs'
                                            ? FastAssetCtxsEvent
                                            : S['type'] extends 'outcomeMetaUpdates'
                                              ? OutcomeMetaUpdatesEvent
                                              : S['type'] extends 'spotAssetCtxs'
                                                ? SpotAssetCtxsEvent
                                                : S['type'] extends 'l2Book'
                                                  ? OrderBookResponse
                                                  : S['type'] extends 'userFills'
                                                    ? UserFillsEvent
                                                    : S['type'] extends 'openOrders'
                                                      ? OpenOrdersEvent
                                                      : S['type'] extends 'activeAssetCtx'
                                                        ? AssetContextEvent
                                                        : GenericWebsocketEvent;

export type WebsocketCallback<S extends WebsocketSubscription> = (
  data: WebsocketEventFor<S>,
) => void;

export interface WebsocketSubscriptionHandle<S extends WebsocketSubscription> {
  readonly subscription: S;
  unsubscribe(): Promise<void>;
}
