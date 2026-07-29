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

export interface PerpAccountSummaryResponse {
  assetPositions: unknown[];
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: PerpMarginSummary;
  marginSummary: PerpMarginSummary;
  time?: number;
  withdrawable: string;
  [key: string]: unknown;
}

export interface AccountBalancesResponse {
  perp: PerpAccountSummaryResponse;
  spot: SpotBalancesResponse;
  user: string;
}

export interface UserFill {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  fee: string;
  hash: string;
  oid: number;
  px: string;
  side: 'A' | 'B';
  sz: string;
  time: number;
  tid: number;
  [key: string]: unknown;
}

export interface PerpMeta {
  universe: Array<{
    isDelisted?: boolean;
    maxLeverage: number;
    name: string;
    onlyIsolated?: boolean;
    szDecimals: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface SpotMeta {
  tokens: Array<{
    index: number;
    name: string;
    tokenId: string;
    weiDecimals: number;
    szDecimals: number;
    [key: string]: unknown;
  }>;
  universe: Array<{
    index: number;
    name: string;
    tokens: number[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
