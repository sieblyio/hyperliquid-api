export interface ExchangeErrorResponse {
  response: string;
  status: 'err';
}

export interface ExchangeSuccessResponse<Data = unknown> {
  response: {
    data?: Data;
    type: string;
    [key: string]: unknown;
  };
  status: 'ok';
}

export type ExchangeResponse<Data = unknown> =
  ExchangeErrorResponse | ExchangeSuccessResponse<Data>;

export interface OrderRestingStatus {
  resting: {
    oid: number;
  };
}

export interface OrderFilledStatus {
  filled: {
    avgPx: string;
    oid: number;
    totalSz: string;
  };
}

export interface OrderErrorStatus {
  error: string;
}

export type OrderStatus =
  OrderErrorStatus | OrderFilledStatus | OrderRestingStatus;

export interface OrderResponseData {
  statuses: OrderStatus[];
}

export interface CancelErrorStatus {
  error: string;
}

export type CancelStatus = 'success' | CancelErrorStatus;

export interface CancelResponseData {
  statuses: CancelStatus[];
}

export interface TwapRunningStatus {
  running: {
    twapId: number;
  };
}

export interface TwapErrorStatus {
  error: string;
}

export interface TwapOrderResponseData {
  status: TwapErrorStatus | TwapRunningStatus;
}

export interface TwapCancelResponseData {
  status: 'success' | TwapErrorStatus;
}

export interface ExchangeDefaultSuccessResponse {
  response: {
    type: 'default';
  };
  status: 'ok';
}

export type ExchangeDefaultResponse =
  ExchangeDefaultSuccessResponse | ExchangeErrorResponse;
