export interface WebSocketMessageEvent {
  data: ArrayBuffer | ArrayBufferView | Blob | string;
}

export interface WebSocketCloseEvent {
  code?: number;
  reason?: string;
}

export interface WebSocketLike {
  close(code?: number, reason?: string): void;
  onclose: ((event: WebSocketCloseEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: WebSocketMessageEvent) => void) | null;
  onopen: (() => void) | null;
  readonly readyState: number;
  send(data: string): void;
}

export interface WebSocketConstructor {
  new (url: string): WebSocketLike;
  readonly CLOSED?: number;
  readonly CLOSING?: number;
  readonly CONNECTING?: number;
  readonly OPEN?: number;
}
