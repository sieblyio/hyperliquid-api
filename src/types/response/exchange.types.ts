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
