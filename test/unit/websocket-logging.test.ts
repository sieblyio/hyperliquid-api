import {
  WebsocketAPIClient,
  WebsocketClient,
  type WebsocketClientOptions,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const LOGGER = { error: jest.fn(), info: jest.fn(), trace: jest.fn() };
const CONTEXT = { category: 'hyperliquid-ws', wsKey: 'public' };
const OPTIONS = {
  connectionTimeout: 100,
  pingInterval: 0,
  reconnectTimeout: 5,
  webSocketConstructor: FakeWebSocket,
};

describe('WebSocket logging conventions', () => {
  const clients: WebsocketClient[] = [];

  function createClient(options: WebsocketClientOptions = {}): WebsocketClient {
    const client = new WebsocketClient({ ...OPTIONS, ...options }, LOGGER);
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
    jest.restoreAllMocks();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  test('logs connection lifecycle at info and subscriptions and messages at trace', async () => {
    const client = createClient();
    const pending = client.subscribe({ type: 'allMids' });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await pending;
    socket.serverClose(1006, 'Connection lost');
    await jest.advanceTimersByTimeAsync(5);
    const replacement = FakeWebSocket.instances[1];
    replacement.open();
    const update = { channel: 'allMids', data: { mids: { BTC: '100' } } };
    replacement.message(update);
    await client.unsubscribe({ type: 'allMids' });
    client.close('public');

    expect(LOGGER.info.mock.calls.map(([message]) => message)).toEqual([
      'Websocket connected',
      'Websocket connection closed',
      'Reconnecting to websocket with delay...',
      'Reconnecting to websocket',
      'Websocket reconnected',
      'Closing connection',
      'Websocket connection closed',
    ]);
    expect(LOGGER.info).toHaveBeenCalledWith(
      'Reconnecting to websocket with delay...',
      {
        ...CONTEXT,
        connectionDelayMs: 5,
        attempt: 1,
        cause: { code: 1006, reason: 'Connection lost' },
      },
    );
    expect(
      LOGGER.trace.mock.calls.filter(([message]) =>
        message.startsWith('Subscribing to '),
      ),
    ).toHaveLength(2);
    expect(LOGGER.trace).toHaveBeenCalledWith(
      'Unsubscribing to 1 "public" topics in 1 batches.',
      { ...CONTEXT, wsTopicRequests: [{ type: 'allMids' }] },
    );
    expect(LOGGER.trace).toHaveBeenCalledWith('onWsMessage().emit(message)', {
      ...CONTEXT,
      event: { ...update, wsKey: 'public' },
    });
    expect(LOGGER.trace).toHaveBeenCalledWith(
      'Disabled client-to-server ping timer',
      CONTEXT,
    );
    for (const [, context] of [
      ...LOGGER.info.mock.calls,
      ...LOGGER.trace.mock.calls,
    ]) {
      expect(context).toMatchObject(CONTEXT);
    }
    expect(LOGGER.error).not.toHaveBeenCalled();
  });

  test.each([true, false])(
    'traces heartbeats and reports their timeout with autoReconnect=%s',
    async (autoReconnect) => {
      const client = createClient({
        autoReconnect,
        pingInterval: 10,
        pongTimeout: 5,
      });
      const socket = await connect(client);
      await jest.advanceTimersByTimeAsync(10);
      socket.message({ channel: 'pong' });
      await jest.advanceTimersByTimeAsync(5);
      expect(client.isConnected()).toBe(true);
      expect(LOGGER.trace).toHaveBeenCalledWith('Enabled ping timer', {
        ...CONTEXT,
        pingInterval: 10,
        pongTimeout: 5,
      });
      expect(LOGGER.trace).toHaveBeenCalledWith('Sending ping', CONTEXT);
      expect(LOGGER.trace).toHaveBeenCalledWith('Received PONG event', {
        ...CONTEXT,
        eventData: '{"channel":"pong"}',
        source: 'event',
      });
      expect(LOGGER.info.mock.calls.map(([message]) => message)).toEqual([
        'Websocket connected',
      ]);

      await jest.advanceTimersByTimeAsync(10);
      expect(client.isConnected()).toBe(false);
      expect(LOGGER.info).toHaveBeenCalledWith(
        autoReconnect
          ? 'Pong timeout - closing socket to reconnect'
          : 'Pong timeout - closing socket',
        { ...CONTEXT, reason: 'Pong timeout', pongTimeout: 5 },
      );
      if (autoReconnect) {
        expect(LOGGER.info).toHaveBeenCalledWith(
          'Reconnecting to websocket with delay...',
          {
            ...CONTEXT,
            connectionDelayMs: 5,
            attempt: 1,
            cause: expect.objectContaining({
              message: 'WebSocket heartbeat timed out.',
            }),
          },
        );
      }
      expect(LOGGER.error).not.toHaveBeenCalled();
    },
  );

  test('makes lifecycle logs visible through DefaultLogger', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const client = new WebsocketClient(OPTIONS);
    clients.push(client);
    await connect(client);
    expect(info).toHaveBeenCalledWith([
      'Websocket connected',
      expect.objectContaining(CONTEXT),
    ]);
  });

  test('uses the supplied API logger for requests, responses, and rejected promises', async () => {
    const api = new WebsocketAPIClient(OPTIONS, LOGGER);
    clients.push(api.getWSClient());
    const first = api.getAllMids();
    await jest.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await jest.advanceTimersByTimeAsync(0);
    const request = socket.jsonMessages()[0] as { id: number };
    const reply = {
      channel: 'post',
      data: {
        id: request.id,
        response: { type: 'info', payload: { data: { BTC: '100' } } },
      },
    };
    socket.message(reply);
    await expect(first).resolves.toEqual({ BTC: '100' });
    const context = { category: 'hyperliquid-ws', wsKey: 'api' };
    expect(LOGGER.trace).toHaveBeenCalledWith('Sending upstream ws message: ', {
      ...context,
      wsMessage: JSON.stringify(request),
    });
    expect(LOGGER.trace).toHaveBeenCalledWith('onWsMessage().emit(response)', {
      ...context,
      event: { ...reply, wsKey: 'api' },
    });

    const rejected = api.getAllMids();
    const assertion = expect(rejected).rejects.toThrow('rejected');
    await jest.advanceTimersByTimeAsync(0);
    const second = socket.jsonMessages()[1] as { id: number };
    socket.message({ channel: 'error', data: `rejected id=${second.id}` });
    await assertion;
    expect(LOGGER.trace).toHaveBeenCalledWith(
      `rejectDeferredPromise(): rejecting api/${second.id}`,
      { ...context, promiseRef: String(second.id), error: expect.any(Error) },
    );
    expect(LOGGER.error).not.toHaveBeenCalled();
  });

  test('reports unmatched errors and replies without settling a different request', async () => {
    const client = createClient();
    const exception = jest.fn();
    const response = jest.fn();
    client.on('exception', exception).on('response', response);
    const pending = client.sendWSAPIRequest('info', { type: 'allMids' });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await jest.advanceTimersByTimeAsync(0);
    const request = socket.jsonMessages()[0] as { id: number };
    const context = { category: 'hyperliquid-ws', wsKey: 'api' };
    const unmatched = { channel: 'error', data: 'Unmatched failure id=999' };
    socket.message(unmatched);
    expect(exception).toHaveBeenCalledWith({ ...unmatched, wsKey: 'api' });
    expect(LOGGER.error).toHaveBeenCalledTimes(1);
    expect(LOGGER.error).toHaveBeenCalledWith(
      'WS API response could not be correlated to request',
      { ...context, requestId: 999, parsed: unmatched },
    );
    for (const data of [undefined, { id: 999 }, { id: 'invalid' }]) {
      const reply = data ? { channel: 'post', data } : { channel: 'post' };
      socket.message(reply);
      expect(LOGGER.error).toHaveBeenLastCalledWith(
        'WS API response could not be correlated to request',
        { ...context, requestId: data?.id, parsed: reply },
      );
      expect(response).toHaveBeenLastCalledWith({ ...reply, wsKey: 'api' });
    }
    socket.message({
      channel: 'post',
      data: {
        id: request.id,
        response: { type: 'info', payload: { data: { BTC: '100' } } },
      },
    });
    await expect(pending).resolves.toEqual({ BTC: '100' });
  });

  test('includes connection context in malformed messages and listener, send, and close failures', async () => {
    const client = createClient({ autoReconnect: false });
    const socket = await connect(client);
    socket.message({ unexpected: true });
    expect(LOGGER.error).toHaveBeenLastCalledWith(
      'Unhandled/unrecognised ws event message - unexpected message format',
      expect.objectContaining(CONTEXT),
    );
    const listenerError = new Error('exception listener failed');
    client.on('exception', () => {
      throw listenerError;
    });
    socket.message('not JSON');
    expect(LOGGER.error).toHaveBeenCalledWith(
      'Failed to parse ws event message',
      {
        ...CONTEXT,
        error: expect.objectContaining({
          message: 'Hyperliquid returned a non-JSON WebSocket message.',
        }),
      },
    );
    expect(LOGGER.error).toHaveBeenLastCalledWith(
      'Exception in onWsMessage().emit(exception) handler:',
      { ...CONTEXT, error: listenerError },
    );
    client.removeAllListeners('exception');
    LOGGER.error.mockClear();
    socket.message({ channel: 'fastAssetCtxs', data: 42 });
    expect(LOGGER.error).toHaveBeenCalledTimes(1);
    expect(LOGGER.error).toHaveBeenLastCalledWith(
      'Failed to decompress ws message event',
      {
        ...CONTEXT,
        error: expect.objectContaining({
          message: 'fastAssetCtxs data must be a base64 string.',
        }),
      },
    );
    LOGGER.error.mockClear();
    client.once('message', () => {
      throw listenerError;
    });
    socket.message({ channel: 'allMids', data: { mids: {} } });
    expect(LOGGER.error).toHaveBeenCalledTimes(1);
    expect(LOGGER.error).toHaveBeenLastCalledWith(
      'Exception in onWsMessage().emit(message) handler:',
      { ...CONTEXT, error: listenerError },
    );
    LOGGER.error.mockClear();
    const sendError = new Error('send failed');
    jest.spyOn(socket, 'send').mockImplementationOnce(() => {
      throw sendError;
    });
    await expect(client.subscribe({ type: 'allMids' })).rejects.toBe(sendError);
    expect(LOGGER.error).toHaveBeenCalledWith('Failed to send WS message', {
      ...CONTEXT,
      wsMessage: JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'allMids' },
      }),
      exception: sendError,
    });
    expect(LOGGER.error).toHaveBeenCalledTimes(1);
    const replacement = await connect(client);
    const closeError = new Error('close failed');
    jest.spyOn(replacement, 'close').mockImplementationOnce(() => {
      throw closeError;
    });
    client.close('public');
    expect(LOGGER.error).toHaveBeenLastCalledWith(
      'Failed to close a WebSocket connection',
      {
        ...CONTEXT,
        error: closeError,
      },
    );
  });

  test.each(['disconnect', 'close', 'abort', 'timeout'] as const)(
    'traces each pending request rejected by %s exactly once',
    async (reason) => {
      const client = createClient({ autoReconnect: false });
      const controller = new AbortController();
      const requests = [1, 2].map(() =>
        client.sendWSAPIRequest(
          'info',
          { type: 'allMids' },
          {
            signal: controller.signal,
            timeout: 50,
          },
        ),
      );
      const results = Promise.allSettled(requests);
      const socket = FakeWebSocket.instances[0];
      socket.open();
      await jest.advanceTimersByTimeAsync(0);
      if (reason === 'disconnect') socket.serverClose();
      else if (reason === 'close') client.closeAll();
      else if (reason === 'abort') controller.abort();
      else await jest.advanceTimersByTimeAsync(50);
      expect(
        (await results).every((result) => result.status === 'rejected'),
      ).toBe(true);
      const rejections = LOGGER.trace.mock.calls.filter(([message]) =>
        message.startsWith('rejectDeferredPromise():'),
      );
      expect(rejections).toHaveLength(2);
      expect(rejections.map(([, context]) => context.promiseRef)).toEqual([
        '1',
        '2',
      ]);
      for (const [, context] of rejections) {
        expect(context).toMatchObject({
          category: 'hyperliquid-ws',
          wsKey: 'api',
          error: expect.any(Error),
        });
      }
      await jest.advanceTimersByTimeAsync(100);
      expect(
        LOGGER.trace.mock.calls.filter(([message]) =>
          message.startsWith('rejectDeferredPromise():'),
        ),
      ).toHaveLength(2);
      expect(LOGGER.error).not.toHaveBeenCalled();
    },
  );
});
