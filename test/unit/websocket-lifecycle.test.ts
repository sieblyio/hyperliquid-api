import {
  WebsocketClient,
  type WebsocketClientOptions,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const LOGGER = { error: jest.fn(), info: jest.fn(), trace: jest.fn() };

describe('WebsocketClient lifecycle', () => {
  const clients: WebsocketClient[] = [];
  function createClient(options: WebsocketClientOptions = {}): WebsocketClient {
    const client = new WebsocketClient(
      {
        connectionTimeout: 100,
        pingInterval: 0,
        reconnectTimeout: 5,
        webSocketConstructor: FakeWebSocket,
        ...options,
      },
      LOGGER,
    );
    clients.push(client);
    return client;
  }

  async function connect(client: WebsocketClient): Promise<FakeWebSocket> {
    const pending = client.connect();
    const socket = FakeWebSocket.instances.at(-1)!;
    socket.open();
    await pending;
    return socket;
  }

  beforeEach(() => {
    FakeWebSocket.reset();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    clients.splice(0).forEach((client) => client.closeAll());
    expect(jest.getTimerCount()).toBe(0);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('shares pending connections and resubscribes only the latest cached topics', async () => {
    const client = createClient();
    const first = client.subscribe([
      { type: 'allMids' },
      { type: 'bbo', coin: 'BTC' },
    ]);
    const second = client.subscribe({ type: 'trades', coin: 'ETH' });
    await client.unsubscribe({ type: 'bbo', coin: 'BTC' });
    expect(FakeWebSocket.instances).toHaveLength(1);
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await Promise.all([first, second]);
    expect(socket.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'allMids' } },
      { method: 'subscribe', subscription: { type: 'trades', coin: 'ETH' } },
    ]);

    socket.serverClose();
    await client.unsubscribe({ type: 'allMids' });
    await jest.advanceTimersByTimeAsync(5);
    const replacement = FakeWebSocket.instances[1];
    replacement.open();
    expect(replacement.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'trades', coin: 'ETH' } },
    ]);
  });

  test('emits open, reconnecting, reconnected, and final close with stable keys', async () => {
    const client = createClient();
    const events: string[] = [];
    for (const name of [
      'open',
      'reconnecting',
      'reconnected',
      'close',
    ] as const) {
      client.on(name, ({ wsKey }) => events.push(`${name}:${wsKey}`));
    }
    const socket = await connect(client);
    socket.serverClose();
    await jest.advanceTimersByTimeAsync(5);
    FakeWebSocket.instances[1].open();
    client.close();
    expect(events).toEqual([
      'open:public',
      'reconnecting:public',
      'reconnected:public',
      'close:public',
    ]);
  });

  test('closing rejects pending work immediately, clears topics, and prevents delayed reconnection', async () => {
    const client = createClient();
    const subscription = client.subscribe({ type: 'allMids' });
    const request = client.sendWSAPIRequest('info', { type: 'allMids' });
    const assertions = [
      expect(subscription).rejects.toThrow('client was closed'),
      expect(request).rejects.toThrow('client was closed'),
    ];
    const oldOpen = FakeWebSocket.instances[0].onopen;
    client.closeAll();
    oldOpen?.();
    await Promise.all(assertions);
    await jest.advanceTimersByTimeAsync(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(client.isConnected()).toBe(false);
    const fresh = await connect(client);
    expect(fresh.jsonMessages()).toEqual([]);
  });

  test('bounds a stalled handshake and preserves desired topics for automatic recovery', async () => {
    const client = createClient();
    const pending = client.subscribe({ type: 'allMids' });
    const assertion = expect(pending).rejects.toThrow(
      'connection timed out after 100 ms',
    );
    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    expect(FakeWebSocket.instances[0].readyState).toBe(FakeWebSocket.CLOSED);
    await jest.advanceTimersByTimeAsync(5);
    const recovered = FakeWebSocket.instances[1];
    recovered.open();
    await client.subscribe({ type: 'allMids' });
    expect(recovered.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'allMids' } },
    ]);
    expect(client.isConnected()).toBe(true);
  });

  test('retries a topic after a failed send without losing it to deduplication', async () => {
    const client = createClient({ autoReconnect: false });
    const socket = await connect(client);
    jest.spyOn(socket, 'send').mockImplementationOnce(() => {
      throw new Error('send failed');
    });
    await expect(client.subscribe({ type: 'allMids' })).rejects.toThrow(
      'send failed',
    );
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    const retry = client.subscribe({ type: 'allMids' });
    const recovered = FakeWebSocket.instances[1];
    recovered.open();
    await retry;
    expect(recovered.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'allMids' } },
    ]);
  });

  test('only a pong satisfies a pending heartbeat', async () => {
    const client = createClient({
      autoReconnect: false,
      pingInterval: 10,
      pongTimeout: 5,
    });
    const socket = await connect(client);
    await jest.advanceTimersByTimeAsync(10);
    expect(socket.jsonMessages()).toEqual([{ method: 'ping' }]);
    socket.message({ channel: 'allMids', data: { mids: {} } });
    await jest.advanceTimersByTimeAsync(5);
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(client.isConnected()).toBe(false);
  });

  test('a valid pong clears its timeout and intentional close clears every timer', async () => {
    const client = createClient({ pingInterval: 10, pongTimeout: 5 });
    const socket = await connect(client);
    await jest.advanceTimersByTimeAsync(10);
    socket.message({ channel: 'pong' });
    await jest.advanceTimersByTimeAsync(5);
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    client.closeAll();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a failed ping is reported and cannot leave an armed timer behind', async () => {
    const client = createClient({
      autoReconnect: false,
      pingInterval: 10,
      pongTimeout: 5,
    });
    const exception = jest.fn();
    client.on('exception', exception);
    const socket = await connect(client);
    jest.spyOn(socket, 'send').mockImplementationOnce(() => {
      throw new Error('ping failed');
    });
    await jest.advanceTimersByTimeAsync(10);
    expect(exception).toHaveBeenCalledWith({
      wsKey: 'public',
      event: new Error('ping failed'),
    });
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('empty topic arrays and unknown unsubscriptions never open a connection', async () => {
    const client = createClient();
    await client.subscribe([]);
    await client.unsubscribe([{ type: 'allMids' }]);
    expect(FakeWebSocket.instances).toEqual([]);
  });

  test('preserves binary message order across asynchronous Blob decoding', async () => {
    const client = createClient();
    const message = jest.fn();
    client.on('message', message);
    const socket = await connect(client);
    let resolveBlob!: (value: string) => void;
    const blob = new Blob();
    jest.spyOn(blob, 'text').mockReturnValue(
      new Promise<string>((resolve) => {
        resolveBlob = resolve;
      }),
    );
    socket.onmessage?.({ data: blob });
    socket.onmessage?.({
      data: new TextEncoder().encode(
        JSON.stringify({ channel: 'allMids', data: { mids: { BTC: '2' } } }),
      ),
    });
    socket.message({ channel: 'allMids', data: { mids: { BTC: '3' } } });
    expect(message).not.toHaveBeenCalled();
    resolveBlob(
      JSON.stringify({ channel: 'allMids', data: { mids: { BTC: '1' } } }),
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(message.mock.calls.map(([event]) => event.data.mids.BTC)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  test('ignores late frames, errors, and Blob completions from a replaced socket', async () => {
    const client = createClient();
    const message = jest.fn();
    const exception = jest.fn();
    client.on('message', message).on('exception', exception);
    const old = await connect(client);
    const oldMessage = old.onmessage;
    const oldError = old.onerror;
    let resolveBlob!: (value: string) => void;
    const blob = new Blob();
    jest.spyOn(blob, 'text').mockReturnValue(
      new Promise<string>((resolve) => {
        resolveBlob = resolve;
      }),
    );
    oldMessage?.({ data: blob });
    old.serverClose();
    await jest.advanceTimersByTimeAsync(5);
    const current = FakeWebSocket.instances[1];
    current.open();
    current.message({ channel: 'allMids', data: { mids: { BTC: 'current' } } });
    oldMessage?.({ data: 'invalid stale JSON' });
    oldError?.(new Error('stale socket error'));
    resolveBlob(
      JSON.stringify({ channel: 'allMids', data: { mids: { BTC: 'stale' } } }),
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(message).toHaveBeenCalledTimes(1);
    expect(message.mock.calls[0][0].data.mids.BTC).toBe('current');
    expect(exception).not.toHaveBeenCalled();
  });

  test.each(['abort', 'timeout'] as const)(
    'does not send a queued API request after %s',
    async (reason) => {
      const client = createClient();
      const controller = new AbortController();
      const pending = client.sendWSAPIRequest(
        'info',
        { type: 'allMids' },
        { signal: controller.signal, timeout: 5 },
      );
      const assertion = expect(pending).rejects.toThrow(
        reason === 'abort' ? 'aborted' : 'timed out',
      );
      if (reason === 'abort') controller.abort();
      else await jest.advanceTimersByTimeAsync(5);
      await assertion;
      const socket = FakeWebSocket.instances[0];
      socket.open();
      await jest.advanceTimersByTimeAsync(0);
      expect(socket.jsonMessages()).toEqual([]);
    },
  );

  test('rejects requests on disconnect and emits raw API replies as responses', async () => {
    const client = createClient();
    const response = jest.fn();
    client.on('response', response);
    const pending = client.sendWSAPIRequest('info', { type: 'allMids' });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await jest.advanceTimersByTimeAsync(0);
    const id = (socket.jsonMessages()[0] as { id: number }).id;
    const reply = {
      channel: 'post',
      data: {
        id,
        response: { type: 'info', payload: { data: { BTC: '100' } } },
      },
    };
    socket.message(reply);
    await expect(pending).resolves.toEqual({ BTC: '100' });
    expect(response).toHaveBeenCalledWith({ ...reply, wsKey: 'api' });

    const disconnected = client.sendWSAPIRequest('info', { type: 'allMids' });
    const assertion = expect(disconnected).rejects.toThrow('connection closed');
    await jest.advanceTimersByTimeAsync(0);
    socket.serverClose();
    await assertion;
    await jest.advanceTimersByTimeAsync(5);
    FakeWebSocket.instances[1].open();
    expect(FakeWebSocket.instances[1].jsonMessages()).toEqual([]);
  });

  test.each([0, -1, NaN, Infinity])(
    'rejects invalid connection timeout %s',
    (connectionTimeout) => {
      expect(() => createClient({ connectionTimeout })).toThrow(RangeError);
      expect(FakeWebSocket.instances).toEqual([]);
    },
  );
});
