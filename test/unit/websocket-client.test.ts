import { deflateSync, strToU8 } from 'fflate';

import {
  type DefaultLogger,
  HyperliquidWebSocketError,
  RestClient,
  WebsocketClient,
  type WebsocketSubscription,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const USER = '0x1111111111111111111111111111111111111111';
const LOGGER: DefaultLogger = {
  error: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
};

describe('WebsocketClient protocol', () => {
  const clients: WebsocketClient[] = [];

  function createClient(): WebsocketClient {
    const client = new WebsocketClient(
      {
        autoReconnect: false,
        pingInterval: 0,
        webSocketConstructor: FakeWebSocket,
      },
      LOGGER,
    );
    clients.push(client);
    return client;
  }

  async function subscribeAndOpen(
    client: WebsocketClient,
    topics: WebsocketSubscription | WebsocketSubscription[],
  ): Promise<FakeWebSocket[]> {
    const pending = client.subscribe(topics);
    for (const socket of FakeWebSocket.instances) {
      if (socket.readyState === FakeWebSocket.CONNECTING) socket.open();
    }
    await pending;
    return FakeWebSocket.instances;
  }

  beforeEach(() => {
    FakeWebSocket.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    clients.splice(0).forEach((client) => client.closeAll());
    jest.restoreAllMocks();
  });

  test('normalizes address casing and defaults without mutating caller topics', async () => {
    const client = createClient();
    const topic = Object.freeze({
      type: 'clearinghouseState' as const,
      user: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      dex: undefined,
    });
    const before = { ...topic };
    const [socket] = await subscribeAndOpen(client, topic);
    await client.unsubscribe({
      type: 'clearinghouseState',
      user: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      dex: '',
    });

    expect(topic).toEqual(before);
    expect(socket.jsonMessages()).toEqual(
      ['subscribe', 'unsubscribe'].map((method) => ({
        method,
        subscription: {
          dex: '',
          type: 'clearinghouseState',
          user: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      })),
    );
  });

  test('preserves explicit null order book precision fields and wire coin identifiers', async () => {
    const client = createClient();
    const topic = {
      coin: '@107',
      mantissa: null,
      nSigFigs: null,
      type: 'l2Book',
    } as const;
    const [socket] = await subscribeAndOpen(client, topic);
    expect(socket.jsonMessages()).toEqual([
      { method: 'subscribe', subscription: topic },
    ]);
  });

  test('resolves aliases explicitly before subscribing without a second metadata lookup', async () => {
    const nameToCoin = jest
      .spyOn(RestClient.prototype, 'nameToCoin')
      .mockResolvedValue('@107');
    const client = createClient();
    const coin = await client.nameToCoin('HYPE/USDC');
    const [socket] = await subscribeAndOpen(client, { coin, type: 'trades' });
    await client.unsubscribe({ coin, type: 'trades' });
    expect(nameToCoin).toHaveBeenCalledTimes(1);
    expect(nameToCoin).toHaveBeenCalledWith('HYPE/USDC');
    expect(socket.jsonMessages()).toEqual(
      ['subscribe', 'unsubscribe'].map((method) => ({
        method,
        subscription: { coin: '@107', type: 'trades' },
      })),
    );
  });

  test('preserves alternate wire channels and emits each received frame once', async () => {
    const client = createClient();
    const message = jest.fn();
    client.on('message', message);
    const [account, market] = await subscribeAndOpen(client, [
      { type: 'userEvents', user: USER },
      { type: 'activeAssetCtx', coin: '@107' },
      { type: 'trades', coin: 'BTC' },
      { type: 'trades', coin: 'ETH' },
    ]);
    account.message({ channel: 'user', data: { nonUserCancel: [] } });
    market.message({
      channel: 'activeSpotAssetCtx',
      data: { coin: '@107', ctx: { markPx: '1' } },
    });
    market.message({ channel: 'trades', data: [{ coin: 'ETH', px: '1' }] });

    expect(
      message.mock.calls.map(([event]) => [event.channel, event.wsKey]),
    ).toEqual([
      ['user', `user:${USER}`],
      ['activeSpotAssetCtx', 'public'],
      ['trades', 'public'],
    ]);
  });

  test('shares scoped account streams and reuses each unscoped user connection', async () => {
    const client = createClient();
    const sockets = await subscribeAndOpen(client, [
      { type: 'orderUpdates', user: USER },
      { type: 'notification', user: USER },
      { type: 'userEvents', user: USER },
      { type: 'userFills', user: USER },
      { type: 'userFills', user: '0x2222222222222222222222222222222222222222' },
    ]);
    expect(sockets).toHaveLength(2);
    expect(sockets.map((socket) => socket.jsonMessages().length)).toEqual([
      3, 2,
    ]);
  });

  test('decompresses fastAssetCtxs in the event envelope and reports malformed data', async () => {
    const client = createClient();
    const message = jest.fn();
    const exception = jest.fn();
    client.on('message', message).on('exception', exception);
    const [socket] = await subscribeAndOpen(client, { type: 'fastAssetCtxs' });
    const data = { BTC: { markPx: '100', midPx: '99' } };
    socket.message({
      channel: 'fastAssetCtxs',
      data: Buffer.from(deflateSync(strToU8(JSON.stringify(data)))).toString(
        'base64',
      ),
    });
    expect(message).toHaveBeenCalledWith({
      channel: 'fastAssetCtxs',
      data,
      wsKey: 'public',
    });

    socket.message({ channel: 'fastAssetCtxs', data: 42 });
    socket.message('not JSON');
    expect(exception).toHaveBeenCalledTimes(2);
    expect(exception.mock.calls[0][0].event).toBeInstanceOf(
      HyperliquidWebSocketError,
    );
    expect(exception.mock.calls[1][0].event.message).toBe(
      'Hyperliquid returned a non-JSON WebSocket message.',
    );
    expect(LOGGER.error).toHaveBeenCalledTimes(2);
    expect(message).toHaveBeenCalledTimes(1);
  });

  test('preserves upstream error frames on the exception event', async () => {
    const client = createClient();
    const exception = jest.fn();
    client.on('exception', exception);
    const [socket] = await subscribeAndOpen(client, { type: 'allMids' });
    socket.message({ channel: 'error', data: 'Subscription rejected' });
    expect(exception).toHaveBeenCalledWith({
      channel: 'error',
      data: 'Subscription rejected',
      wsKey: 'public',
    });
  });

  test('reports listener failures and leaves the connection usable', async () => {
    const client = createClient();
    const exception = jest.fn();
    const message = jest.fn();
    client.on('exception', exception);
    client.on('open', () => {
      throw new Error('open listener failed');
    });
    const [socket] = await subscribeAndOpen(client, { type: 'allMids' });
    client.once('message', () => {
      throw new Error('message listener failed');
    });
    socket.message({ channel: 'allMids', data: { mids: {} } });
    client.on('message', message);
    socket.message({ channel: 'allMids', data: { mids: { BTC: '100' } } });

    expect(exception.mock.calls.map(([event]) => event.event.message)).toEqual([
      'open listener failed',
      'message listener failed',
    ]);
    expect(message).toHaveBeenCalledTimes(1);
    expect(client.isConnected()).toBe(true);
  });

  test('exposes numeric asset resolution and manual metadata refresh', async () => {
    const refresh = jest
      .spyOn(RestClient.prototype, 'refreshAssetMetadata')
      .mockResolvedValue();
    const client = createClient();
    await expect(client.resolveAsset(10_107)).resolves.toMatchObject({
      assetId: 10_107,
      kind: 'spot',
    });
    await client.refreshAssetMetadata();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
