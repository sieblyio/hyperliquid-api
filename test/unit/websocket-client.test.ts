import { deflateSync, strToU8 } from 'fflate';

import {
  type DefaultLogger,
  HyperliquidWebSocketError,
  RestClient,
  WebsocketClient,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const TEST_LOGGER: DefaultLogger = {
  error: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
};

async function subscribeAndOpen(
  client: WebsocketClient,
  subscription: Parameters<WebsocketClient['subscribe']>[0],
  callback: (value: unknown) => void,
): Promise<Awaited<ReturnType<WebsocketClient['subscribe']>>> {
  const before = FakeWebSocket.instances.length;
  const subscribing = client.subscribe(subscription, callback);
  for (let attempt = 0; attempt < 50; attempt++) {
    await Promise.resolve();
    if (FakeWebSocket.instances.length > before) {
      FakeWebSocket.instances.at(-1)?.open();
      break;
    }
  }
  return subscribing;
}

describe('WebsocketClient', () => {
  let nameToCoin: jest.SpiedFunction<RestClient['nameToCoin']>;

  beforeEach(() => {
    FakeWebSocket.reset();
    jest.clearAllMocks();
    jest.useRealTimers();
    nameToCoin = jest
      .spyOn(RestClient.prototype, 'nameToCoin')
      .mockImplementation(async (name) => name);
  });

  afterEach(() => {
    nameToCoin.mockRestore();
  });

  test('deduplicates subscriptions and unsubscribes only after the final callback', async () => {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
      },
      TEST_LOGGER,
    );
    const first = jest.fn();
    const second = jest.fn();
    const firstHandle = await subscribeAndOpen(
      client,
      { coin: 'BTC', type: 'trades' },
      first,
    );
    const secondHandle = await client.subscribe(
      { coin: 'BTC', type: 'trades' },
      second,
    );
    const socket = FakeWebSocket.instances[0];

    expect(socket?.jsonMessages()).toEqual([
      {
        method: 'subscribe',
        subscription: { coin: 'BTC', type: 'trades' },
      },
    ]);
    socket?.message({
      channel: 'trades',
      data: [{ coin: 'BTC', px: '1' }],
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    await firstHandle.unsubscribe();
    expect(socket?.jsonMessages()).toHaveLength(1);
    await secondHandle.unsubscribe();
    expect(socket?.jsonMessages()).toHaveLength(2);
    expect(socket?.jsonMessages()[1]).toEqual({
      method: 'unsubscribe',
      subscription: { coin: 'BTC', type: 'trades' },
    });
    client.close();
  });

  test('remaps coin subscriptions like the official Python SDK', async () => {
    nameToCoin.mockImplementation(async (name) =>
      name === 'HYPE/USDC' ? '@107' : name,
    );
    const options = {
      autoReconnect: false,
      pingInterval: 0,
      webSocketConstructor: FakeWebSocket,
    };
    const callback = jest.fn();
    const remapped: Parameters<WebsocketClient['subscribe']>[0][] = [
      { coin: 'HYPE/USDC', type: 'l2Book' },
      { coin: 'HYPE/USDC', type: 'trades' },
      { coin: 'HYPE/USDC', interval: '1m', type: 'candle' },
      { coin: 'HYPE/USDC', type: 'bbo' },
      { coin: 'HYPE/USDC', type: 'activeAssetCtx' },
    ];
    for (const subscription of remapped) {
      FakeWebSocket.reset();
      const client = new WebsocketClient(options);
      await subscribeAndOpen(client, subscription, callback);
      expect(FakeWebSocket.instances[0]?.jsonMessages()[0]).toMatchObject({
        method: 'subscribe',
        subscription: { coin: '@107', type: subscription.type },
      });
      client.close();
    }

    FakeWebSocket.reset();
    const client = new WebsocketClient(options);
    await subscribeAndOpen(
      client,
      {
        coin: 'HYPE/USDC',
        type: 'activeAssetData',
        user: '0x1111111111111111111111111111111111111111',
      },
      callback,
    );
    expect(FakeWebSocket.instances[0]?.jsonMessages()[0]).toEqual({
      method: 'subscribe',
      subscription: {
        coin: 'HYPE/USDC',
        type: 'activeAssetData',
        user: '0x1111111111111111111111111111111111111111',
      },
    });
    client.close();
  });

  test('normalizes defaults for exact unsubscribe matching', async () => {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
      },
      TEST_LOGGER,
    );
    const callback = jest.fn();
    await subscribeAndOpen(
      client,
      {
        dex: undefined,
        type: 'clearinghouseState',
        user: '0x1111111111111111111111111111111111111111',
      },
      callback,
    );
    await client.unsubscribe(
      {
        type: 'clearinghouseState',
        user: '0x1111111111111111111111111111111111111111',
      },
      callback,
    );
    expect(FakeWebSocket.instances[0]?.jsonMessages()).toEqual([
      {
        method: 'subscribe',
        subscription: {
          dex: '',
          type: 'clearinghouseState',
          user: '0x1111111111111111111111111111111111111111',
        },
      },
      {
        method: 'unsubscribe',
        subscription: {
          dex: '',
          type: 'clearinghouseState',
          user: '0x1111111111111111111111111111111111111111',
        },
      },
    ]);
    client.close();
  });

  test('preserves explicit null order book precision fields', async () => {
    const client = new WebsocketClient({
      autoReconnect: false,
      pingInterval: 0,
      webSocketConstructor: FakeWebSocket,
    });
    await subscribeAndOpen(
      client,
      {
        coin: 'BTC',
        mantissa: null,
        nSigFigs: null,
        type: 'l2Book',
      },
      jest.fn(),
    );

    expect(FakeWebSocket.instances[0]?.jsonMessages()).toEqual([
      {
        method: 'subscribe',
        subscription: {
          coin: 'BTC',
          mantissa: null,
          nSigFigs: null,
          type: 'l2Book',
        },
      },
    ]);
    client.close();
  });

  test('isolates unscoped user callbacks on separate connections', async () => {
    const client = new WebsocketClient({
      autoReconnect: false,
      pingInterval: 0,
      webSocketConstructor: FakeWebSocket,
    });
    const first = jest.fn();
    const second = jest.fn();
    const firstPromise = client.subscribe(
      {
        type: 'notification',
        user: '0x1111111111111111111111111111111111111111',
      },
      first,
    );
    for (
      let attempt = 0;
      attempt < 50 && !FakeWebSocket.instances[0];
      attempt++
    ) {
      await Promise.resolve();
    }
    FakeWebSocket.instances[0]?.open();
    await firstPromise;
    const secondPromise = client.subscribe(
      {
        type: 'notification',
        user: '0x2222222222222222222222222222222222222222',
      },
      second,
    );
    for (
      let attempt = 0;
      attempt < 50 && !FakeWebSocket.instances[1];
      attempt++
    ) {
      await Promise.resolve();
    }
    FakeWebSocket.instances[1]?.open();
    await secondPromise;

    FakeWebSocket.instances[0]?.message({
      channel: 'notification',
      data: { notification: 'first' },
    });
    expect(first).toHaveBeenCalledWith({ notification: 'first' });
    expect(second).not.toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(2);
    client.close();
  });

  test('filters shared-channel messages by coin, interval, dex, and user', async () => {
    const client = new WebsocketClient({
      autoReconnect: false,
      pingInterval: 0,
      webSocketConstructor: FakeWebSocket,
    });
    const btc = jest.fn();
    const eth = jest.fn();
    await subscribeAndOpen(client, { coin: 'BTC', type: 'trades' }, btc);
    await client.subscribe({ coin: 'ETH', type: 'trades' }, eth);

    FakeWebSocket.instances[0]?.message({
      channel: 'trades',
      data: [{ coin: 'ETH', px: '1' }],
    });
    expect(btc).not.toHaveBeenCalled();
    expect(eth).toHaveBeenCalledTimes(1);
    client.close();
  });

  test('decompresses fastAssetCtxs and reports malformed data', async () => {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
      },
      TEST_LOGGER,
    );
    const callback = jest.fn();
    const onError = jest.fn();
    client.on('exception', onError);
    await subscribeAndOpen(client, { type: 'fastAssetCtxs' }, callback);
    const payload = { BTC: { markPx: '100', midPx: '99' } };
    const compressed = Buffer.from(
      deflateSync(strToU8(JSON.stringify(payload))),
    ).toString('base64');

    FakeWebSocket.instances[0]?.message({
      channel: 'fastAssetCtxs',
      data: compressed,
    });
    expect(callback).toHaveBeenCalledWith(payload);

    FakeWebSocket.instances[0]?.message({
      channel: 'fastAssetCtxs',
      data: 42,
    });
    expect(onError.mock.calls[0]?.[0].event).toBeInstanceOf(
      HyperliquidWebSocketError,
    );

    FakeWebSocket.instances[0]?.message('not JSON');
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1]?.[0].event).toMatchObject({
      message: 'Hyperliquid returned a non-JSON WebSocket message.',
      name: 'HyperliquidWebSocketError',
    });
    expect(TEST_LOGGER.error).toHaveBeenCalledTimes(2);
    client.close();
  });

  test('reconnects and resubscribes with bounded delay', async () => {
    jest.useFakeTimers();
    const client = new WebsocketClient({
      pingInterval: 0,
      reconnectTimeout: 5,
      webSocketConstructor: FakeWebSocket,
    });
    await subscribeAndOpen(client, { coin: 'BTC', type: 'bbo' }, jest.fn());
    FakeWebSocket.instances[0]?.serverClose();
    await jest.advanceTimersByTimeAsync(5);
    expect(FakeWebSocket.instances).toHaveLength(2);
    FakeWebSocket.instances[1]?.open();
    expect(FakeWebSocket.instances[1]?.jsonMessages()).toEqual([
      {
        method: 'subscribe',
        subscription: { coin: 'BTC', type: 'bbo' },
      },
    ]);
    client.close();
  });

  test('sends heartbeats and closes a connection without a pong', async () => {
    jest.useFakeTimers();
    const client = new WebsocketClient({
      autoReconnect: false,
      pingInterval: 10,
      pongTimeout: 5,
      webSocketConstructor: FakeWebSocket,
    });
    const connecting = client.connect();
    FakeWebSocket.instances[0]?.open();
    await connecting;
    await jest.advanceTimersByTimeAsync(10);
    expect(FakeWebSocket.instances[0]?.jsonMessages()).toContainEqual({
      method: 'ping',
    });
    await jest.advanceTimersByTimeAsync(5);
    expect(FakeWebSocket.instances[0]?.readyState).toBe(FakeWebSocket.CLOSED);
    client.close();
  });

  test('isolates callback and lifecycle listener failures', async () => {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
      },
      TEST_LOGGER,
    );
    const healthy = jest.fn();
    const onError = jest.fn();
    client.on('open', () => {
      throw new Error('listener failure');
    });
    client.on('open', healthy);
    client.on('exception', onError);
    await subscribeAndOpen(client, { coin: 'BTC', type: 'trades' }, () => {
      throw new Error('callback failure');
    });
    FakeWebSocket.instances[0]?.message({
      channel: 'trades',
      data: [{ coin: 'BTC' }],
    });

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls.map(([context]) => context.event)).toContainEqual(
      new Error('callback failure'),
    );
    client.close();
  });

  test('exposes numeric asset resolution and manual metadata refresh', async () => {
    const client = new WebsocketClient({
      autoReconnect: false,
      pingInterval: 0,
      webSocketConstructor: FakeWebSocket,
    });
    await expect(client.resolveAsset(10_107)).resolves.toMatchObject({
      assetId: 10_107,
      kind: 'spot',
    });
    const metadataClient = (
      client as unknown as {
        metadataClient: { refreshAssetMetadata(): Promise<void> };
      }
    ).metadataClient;
    const refresh = jest
      .spyOn(metadataClient, 'refreshAssetMetadata')
      .mockResolvedValue();

    await expect(client.refreshAssetMetadata()).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(1);
    client.close();
  });
});
