import { EventEmitter } from 'node:events';

import {
  type DefaultLogger,
  WebsocketClient,
  type WebsocketClientOptions,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const USER_A = '0x1111111111111111111111111111111111111111';
const USER_B = '0x2222222222222222222222222222222222222222';
const LOGGER: DefaultLogger = {
  error: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
};

describe('WebsocketClient event contract', () => {
  const clients: WebsocketClient[] = [];

  function createClient(options: WebsocketClientOptions = {}): WebsocketClient {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
        ...options,
      },
      LOGGER,
    );
    clients.push(client);
    return client;
  }

  async function subscribeAndOpen(
    client: WebsocketClient,
    subscriptions: Parameters<WebsocketClient['subscribe']>[0],
  ): Promise<FakeWebSocket> {
    const before = FakeWebSocket.instances.length;
    const pending = client.subscribe(subscriptions);
    // Observe a failed subscription even if the assertion below fails first.
    void pending.catch(() => undefined);
    for (let attempt = 0; attempt < 50; attempt++) {
      await Promise.resolve();
      if (FakeWebSocket.instances.length > before) {
        break;
      }
    }
    const socket = FakeWebSocket.instances.at(-1);
    socket?.open();
    await pending;
    expect(socket).toBeDefined();
    return socket!;
  }

  beforeEach(() => {
    FakeWebSocket.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.closeAll();
    }
  });

  test('emits market updates with their original envelope and connection key', async () => {
    const client = createClient();
    const message = jest.fn();
    const exception = jest.fn();
    client.on('message', message).on('exception', exception);
    const socket = await subscribeAndOpen(client, { type: 'allMids' });
    const update = {
      channel: 'allMids',
      data: { mids: { BTC: '100' } },
      extraWireField: 'preserved',
    };

    socket.message(update);

    expect(message).toHaveBeenCalledTimes(1);
    expect(message).toHaveBeenCalledWith({
      ...update,
      wsKey: 'public',
    });
    expect(exception).not.toHaveBeenCalled();
  });

  test('identifies account updates whose wire payload omits the user', async () => {
    const client = createClient();
    const message = jest.fn();
    client.on('message', message);
    const first = await subscribeAndOpen(client, {
      type: 'orderUpdates',
      user: USER_A,
    });
    const second = await subscribeAndOpen(client, {
      type: 'orderUpdates',
      user: USER_B,
    });

    first.message({ channel: 'orderUpdates', data: [] });
    second.message({ channel: 'orderUpdates', data: [] });

    expect(message.mock.calls.map(([event]) => event.wsKey)).toEqual([
      `user:${USER_A}`,
      `user:${USER_B}`,
    ]);
  });

  test('emits subscription acknowledgements as responses and consumes pongs internally', async () => {
    const client = createClient();
    const response = jest.fn();
    const message = jest.fn();
    client.on('response', response).on('message', message);
    const socket = await subscribeAndOpen(client, { type: 'allMids' });

    for (const method of ['subscribe', 'unsubscribe']) {
      socket.message({
        channel: 'subscriptionResponse',
        data: { method, subscription: { type: 'allMids' } },
      });
    }
    socket.message({ channel: 'pong' });

    expect(response.mock.calls.map(([event]) => event.data.method)).toEqual([
      'subscribe',
      'unsubscribe',
    ]);
    expect(
      response.mock.calls.every(([event]) => event.wsKey === 'public'),
    ).toBe(true);
    expect(message).not.toHaveBeenCalled();
  });

  test('deduplicates topic arrays by value independently of listeners', async () => {
    const client = createClient();
    const socket = await subscribeAndOpen(client, [
      { type: 'allMids' },
      { type: 'allMids', dex: '' },
      { type: 'userFills', user: USER_A },
      { aggregateByTime: false, type: 'userFills', user: USER_A },
    ]);
    const first = jest.fn();
    const second = jest.fn();
    client.on('message', first).on('message', second);
    await client.subscribe({ type: 'allMids' });

    expect(socket.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'allMids' } },
      {
        method: 'subscribe',
        subscription: {
          aggregateByTime: false,
          type: 'userFills',
          user: USER_A,
        },
      },
    ]);

    client.off('message', first);
    expect(socket.jsonMessages()).toHaveLength(2);
    await client.unsubscribe([{ type: 'allMids' }, { type: 'allMids' }]);
    expect(socket.jsonMessages().at(-1)).toEqual({
      method: 'unsubscribe',
      subscription: { type: 'allMids' },
    });
    expect(socket.jsonMessages()).toHaveLength(3);
    expect(client.listenerCount('message')).toBe(1);
  });

  test('provides native EventEmitter listener registration and removal semantics', async () => {
    const client = createClient();
    expect(client).toBeInstanceOf(EventEmitter);
    const removed = jest.fn();
    const duplicate = jest.fn();
    client.once('open', removed).off('open', removed);
    client.on('open', duplicate).on('open', duplicate);

    await subscribeAndOpen(client, { type: 'allMids' });

    expect(removed).not.toHaveBeenCalled();
    expect(duplicate).toHaveBeenCalledTimes(2);
    expect(client.listenerCount('open', duplicate)).toBe(2);
    client.removeListener('open', duplicate);
    expect(client.listenerCount('open', duplicate)).toBe(1);
    client.removeAllListeners();
    expect(client.eventNames()).toEqual([]);
  });

  test('subscribes and unsubscribes native coin identifiers without HTTP metadata', async () => {
    const adapter = jest
      .fn()
      .mockRejectedValue(new Error('Metadata unavailable'));
    const client = createClient({ requestOptions: { adapter } });
    const socket = await subscribeAndOpen(client, {
      type: 'trades',
      coin: 'BTC',
    });
    await client.unsubscribe({ type: 'trades', coin: 'BTC' });

    expect(adapter).not.toHaveBeenCalled();
    expect(socket.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: { type: 'trades', coin: 'BTC' } },
      { method: 'unsubscribe', subscription: { type: 'trades', coin: 'BTC' } },
    ]);
  });
});
