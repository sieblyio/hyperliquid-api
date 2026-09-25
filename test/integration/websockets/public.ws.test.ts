import { setTimeout as delay } from 'node:timers/promises';

import type WebSocket from 'ws';

import {
  type DefaultLogger,
  WebsocketAPIClient,
  WebsocketClient,
  type WebsocketConnectionContext,
  type WebsocketMessageEvent,
  type WebsocketResponseEvent,
  type WebsocketSubscription,
} from '../../../src/index.js';

async function waitFor(check: () => boolean, description: string) {
  const deadline = Date.now() + 20_000;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error(`Timed out: ${description}`);
    await delay(25);
  }
}

// These tests use Hyperliquid's actual servers with the SDK's default timers.
// They never provide credentials or submit signed actions.
describe.each([
  { network: 'mainnet', testnet: false },
  { network: 'testnet', testnet: true },
])('WEBSOCKET PUBLIC ($network)', ({ testnet }) => {
  it('receives live streams and pongs, restores subscriptions, and confirms unsubscribe and close', async () => {
    let pongs = 0;
    let subscribeSends = 0;
    const logger: DefaultLogger = {
      info: jest.fn(),
      error: jest.fn(),
      trace(message, context) {
        if (message === 'Received PONG event') pongs += 1;
        if (message === 'Sending upstream ws message: ') {
          const { wsMessage } = context as { wsMessage: string };
          if (JSON.parse(wsMessage).method === 'subscribe') subscribeSends += 1;
        }
      },
    };
    const client = new WebsocketClient({ testnet }, logger);
    const messages = new Map<string, WebsocketMessageEvent>();
    const responses: WebsocketResponseEvent[] = [];
    const sockets: WebSocket[] = [];
    let reconnects = 0;
    let closed = 0;
    const captureSocket = ({ ws }: WebsocketConnectionContext) => {
      sockets.push(ws as WebSocket);
    };
    client.on('open', captureSocket);
    client.on('reconnected', (event) => {
      captureSocket(event);
      reconnects += 1;
    });
    client.on('message', (event) => messages.set(event.channel, event));
    client.on('response', (event) => responses.push(event));
    client.on('close', () => {
      closed += 1;
    });
    const subscriptions: WebsocketSubscription[] = [
      { type: 'allMids' },
      { type: 'l2Book', coin: 'BTC' },
      { type: 'fastAssetCtxs' },
    ];
    const confirmations = () =>
      responses.filter(
        (event) =>
          event.channel === 'subscriptionResponse' &&
          event.data.method === 'subscribe',
      );
    try {
      await client.subscribe(subscriptions);
      await waitFor(
        () =>
          subscriptions.every(({ type }) => messages.has(type)) &&
          confirmations().length === 3 &&
          pongs > 0,
        'live data, subscription acknowledgements, and heartbeat pong',
      );
      expect(messages.get('allMids')).toMatchObject({
        channel: 'allMids',
        data: { mids: { BTC: expect.any(String) } },
        wsKey: 'public',
      });
      expect(messages.get('l2Book')).toMatchObject({
        channel: 'l2Book',
        data: { coin: 'BTC', levels: [expect.any(Array), expect.any(Array)] },
      });
      expect(messages.get('fastAssetCtxs')?.data).toEqual(expect.any(Object));
      expect(
        Object.keys(messages.get('fastAssetCtxs')!.data).length,
      ).toBeGreaterThan(0);
      await client.subscribe(subscriptions);
      expect(subscribeSends).toBe(3);

      // Interrupt the actual exchange transport, not the SDK's intentional-close path.
      // Every acknowledgement and data message below must come from the new connection.
      sockets.at(-1)!.terminate();
      messages.clear();
      responses.length = 0;
      const previousPongs = pongs;
      await waitFor(
        () =>
          reconnects > 0 &&
          confirmations().length === 3 &&
          subscriptions.every(({ type }) => messages.has(type)) &&
          pongs > previousPongs,
        'reconnection, restored subscriptions, and a new heartbeat pong',
      );
      expect(subscribeSends).toBe(6);
      expect(client.isConnected()).toBe(true);
      await client.unsubscribe({ type: 'l2Book', coin: 'BTC' });
      await waitFor(
        () =>
          responses.some(
            (event) =>
              event.channel === 'subscriptionResponse' &&
              event.data.method === 'unsubscribe' &&
              event.data.subscription.type === 'l2Book' &&
              event.data.subscription.coin === 'BTC',
          ),
        'exchange acknowledgement of the exact unsubscribe',
      );
      client.close();
      expect(closed).toBe(0);
      await waitFor(() => closed === 1, 'actual socket close confirmation');
      expect(client.isConnected()).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Websocket reconnected',
        expect.objectContaining({
          category: 'hyperliquid-ws',
          wsKey: 'public',
        }),
      );
    } finally {
      client.close();
      sockets.forEach((socket) => socket.terminate());
    }
  }, 45_000);

  it('correlates concurrent API replies and real exchange errors, then works after reconnecting', async () => {
    const logger: DefaultLogger = {
      info: jest.fn(),
      error: jest.fn(),
      trace() {},
    };
    const api = new WebsocketAPIClient({ testnet }, logger);
    const sockets: WebSocket[] = [];
    const wireErrors: string[] = [];
    const exception = jest.fn();
    let reconnects = 0;
    let closed = 0;
    const captureSocket = ({ ws }: WebsocketConnectionContext) => {
      const socket = ws as WebSocket;
      sockets.push(socket);
      // Observe the exchange's unmodified error alongside the SDK's promise result.
      socket.on('message', (data) => {
        const event = JSON.parse(data.toString());
        if (event.channel === 'error') wireErrors.push(event.data);
        if (
          event.channel === 'post' &&
          event.data?.response?.type === 'error'
        ) {
          wireErrors.push(event.data.response.payload);
        }
      });
    };
    api.on('open', captureSocket);
    api.on('exception', exception);
    api.on('reconnected', (event) => {
      captureSocket(event);
      reconnects += 1;
    });
    api.on('close', () => {
      closed += 1;
    });
    try {
      const [mids, metadata, book] = await Promise.all([
        api.getAllMids(),
        api.getPerpMetadata(),
        api.getOrderBook({ coin: 'BTC' }),
      ]);
      expect(Number(mids.BTC)).toBeGreaterThan(0);
      expect(metadata.universe.some(({ name }) => name === 'BTC')).toBe(true);
      expect(book).toMatchObject({
        coin: 'BTC',
        levels: [expect.any(Array), expect.any(Array)],
      });

      // Only this deliberately invalid public query should fail. The concurrent valid
      // query must still settle, and the rejection must match the server, not a timeout.
      const [invalid, valid] = await Promise.allSettled([
        api
          .getWSClient()
          .sendWSAPIRequest('info', { type: '__invalid_public_info_probe__' }),
        api.getAllMids(),
      ]);
      expect(invalid.status).toBe('rejected');
      if (invalid.status === 'rejected') {
        expect(wireErrors).toContain(invalid.reason.message);
      }
      expect(exception).toHaveBeenCalledTimes(1);
      expect(exception).toHaveBeenCalledWith(
        expect.objectContaining({ wsKey: 'api' }),
      );
      expect(valid.status).toBe('fulfilled');
      if (valid.status === 'fulfilled')
        expect(Number(valid.value.BTC)).toBeGreaterThan(0);

      sockets.at(-1)!.terminate();
      await waitFor(() => reconnects === 1, 'WS API reconnection');
      expect(Number((await api.getAllMids()).BTC)).toBeGreaterThan(0);
      api.close();
      expect(closed).toBe(0);
      await waitFor(() => closed === 1, 'WS API close confirmation');
      expect(api.isConnected()).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
    } finally {
      api.close();
      sockets.forEach((socket) => socket.terminate());
    }
  }, 45_000);

  it('handles a late reply after cancellation and cleans up a disconnected socket only once', async () => {
    const controller = new AbortController();
    const logger: DefaultLogger = {
      info: jest.fn(),
      error: jest.fn(),
      trace(message) {
        // Cancel only after the request has gone to the actual exchange server.
        if (
          typeof message === 'string' &&
          message.startsWith('sendWSAPIRequest(): sent')
        ) {
          controller.abort();
        }
      },
    };
    const client = new WebsocketClient(
      { testnet, autoReconnect: false },
      logger,
    );
    const response = jest.fn();
    const close = jest.fn();
    let socket: WebSocket | undefined;
    client.on('open', ({ ws }) => {
      socket = ws as WebSocket;
    });
    client.on('response', response).on('close', close);
    try {
      await expect(
        client.sendWSAPIRequest(
          'info',
          { type: 'allMids' },
          {
            signal: controller.signal,
          },
        ),
      ).rejects.toThrow('aborted');
      await waitFor(
        () => response.mock.calls.length === 1,
        'exchange reply after local cancellation',
      );
      expect(response).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'post', wsKey: 'api' }),
      );
      expect(logger.error).not.toHaveBeenCalled();
      expect(client.isConnected('api')).toBe(true);

      socket!.terminate();
      await waitFor(
        () => close.mock.calls.length === 1,
        'close without automatic reconnection',
      );
      client.close();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      client.close();
      socket?.terminate();
    }
  }, 30_000);
});
