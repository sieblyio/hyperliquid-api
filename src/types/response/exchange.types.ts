export interface ExchangeErrorResponse {
  response: string;
  status: 'err';
}

/**
 * Exchange result. Omit Data for acknowledgements, provide it for actions
 * returning data, or use unknown for raw actions with unknown results.
 */
export type ExchangeResponse<Data = undefined> =
  | ExchangeErrorResponse
  | {
      response: [Data] extends [undefined]
        ? { type: 'default' }
        : unknown extends Data
          ? { type: string; data?: Data }
          : { type: string; data: Data };
      status: 'ok';
    };

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
