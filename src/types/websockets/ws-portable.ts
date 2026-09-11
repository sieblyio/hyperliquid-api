export interface WebSocketMessageEvent {
  data: ArrayBuffer | ArrayBufferView | Blob | string;
}

export interface WebSocketCloseEvent {
  code?: number;
  reason?: string;
}

export interface WebSocketLike {
  binaryType?: string;
  close(code?: number, reason?: string): void;
  onclose: ((event: WebSocketCloseEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: WebSocketMessageEvent) => void) | null;
  onopen: (() => void) | null;
  readonly readyState: number;
  send(data: string): void;
  /** Node.js extension used when a failed connection cannot close gracefully. */
  terminate?(): void;
}

/** SDK-owned types keep Node's emitter declarations out of browser consumers. */
export interface EventEmitterLike<
  TEvents extends { [K in keyof TEvents]: unknown[] },
> {
  addListener<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  once<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  prependListener<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  prependOnceListener<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  off<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  removeListener<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void,
  ): this;
  removeAllListeners(event?: keyof TEvents): this;
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  listeners<K extends keyof TEvents>(
    event: K,
  ): Array<(...args: TEvents[K]) => void>;
  rawListeners<K extends keyof TEvents>(
    event: K,
  ): Array<(...args: TEvents[K]) => void>;
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean;
  listenerCount<K extends keyof TEvents>(
    event: K,
    listener?: (...args: TEvents[K]) => void,
  ): number;
  eventNames(): Array<keyof TEvents>;
}

export interface EventEmitterConstructor {
  new <
    TEvents extends { [K in keyof TEvents]: unknown[] },
  >(): EventEmitterLike<TEvents>;
}

export interface WebSocketConstructor {
  new (url: string): WebSocketLike;
  readonly CLOSED?: number;
  readonly CLOSING?: number;
  readonly CONNECTING?: number;
  readonly OPEN?: number;
}
