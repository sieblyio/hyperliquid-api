export interface AccountRequest {
  user?: string;
}

export interface AccountDexRequest extends AccountRequest {
  dex?: string;
}

export interface UserRequest {
  user: string;
}

export interface TimeRangeRequest extends AccountRequest {
  endTime?: number;
  startTime?: number;
}

export interface GetCandlesRequest {
  coin: string;
  endTime?: number;
  interval:
    | '1d'
    | '12h'
    | '15m'
    | '1h'
    | '1m'
    | '2h'
    | '30m'
    | '3d'
    | '3m'
    | '4h'
    | '5m'
    | '8h'
    | '1w'
    | '1M';
  startTime: number;
}

export interface GetOrderBookRequest {
  coin: string;
  mantissa?: 1 | 2 | 5 | null;
  nSigFigs?: 2 | 3 | 4 | 5 | null;
}

export interface GetUserFillsRequest extends AccountRequest {
  aggregateByTime?: boolean;
}

export interface GetUserFillsByTimeRequest extends TimeRangeRequest {
  aggregateByTime?: boolean;
  reversed?: boolean;
  startTime: number;
}

export interface GetUserFundingHistoryRequest extends AccountRequest {
  endTime?: number;
  startTime?: number;
}

export interface GetFundingHistoryRequest {
  coin: string;
  endTime?: number;
  startTime: number;
}

export interface GetUserNonFundingLedgerUpdatesRequest extends AccountRequest {
  endTime?: number;
  startTime?: number;
}

export interface GetOrderStatusRequest extends AccountRequest {
  oid: number | string;
}

export interface GetUserTwapSliceFillsByTimeRequest extends AccountRequest {
  endTime?: number;
  startTime: number;
}

export interface GetUserBorrowLendInterestRequest extends AccountRequest {
  endTime?: number;
  startTime: number;
}

export interface GetMaxBuilderFeeRequest extends AccountRequest {
  builder: string;
}

export interface GetPreTransferCheckRequest extends UserRequest {
  source: string;
}

export interface GetVaultDetailsRequest {
  user?: string;
  vaultAddress: string;
}
