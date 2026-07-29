import type {
  WebSocketCloseEvent,
  WebSocketLike,
  WebSocketMessageEvent,
} from '../../src/index.js';

export class FakeWebSocket implements WebSocketLike {
  static readonly CLOSED = 3;

  static readonly CLOSING = 2;

  static readonly CONNECTING = 0;

  static readonly OPEN = 1;

  static instances: FakeWebSocket[] = [];

  readonly sent: string[] = [];

  readyState = FakeWebSocket.CONNECTING;

  onclose: ((event: WebSocketCloseEvent) => void) | null = null;

  onerror: ((event: unknown) => void) | null = null;

  onmessage: ((event: WebSocketMessageEvent) => void) | null = null;

  onopen: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(value: unknown): void {
    this.onmessage?.({
      data: typeof value === 'string' ? value : JSON.stringify(value),
    });
  }

  error(value: unknown): void {
    this.onerror?.(value);
  }

  serverClose(code = 1006, reason = 'Disconnected'): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = 'Client closed'): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  jsonMessages(): unknown[] {
    return this.sent.map((message) => JSON.parse(message) as unknown);
  }
}
