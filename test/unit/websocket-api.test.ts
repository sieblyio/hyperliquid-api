import {
  type DefaultLogger,
  HyperliquidApiError,
  HyperliquidWebSocketError,
  WebsocketAPIClient,
  WebsocketClient,
} from '../../src/index.js';
import { FakeWebSocket } from '../support/fake-websocket.js';

const PRIVATE_KEY =
  '0x0123456789012345678901234567890123456789012345678901234567890123';
const PARTNER = {
  approvalPercentage: '0.01%',
  builder: {
    b: '0x72f1ad41b790228c4bc4c08eb1e007bf6e4448c2',
    f: 10,
  },
  referralCode: 'SIEBLY',
};
const TEST_LOGGER: DefaultLogger = {
  error: jest.fn(),
  info: jest.fn(),
  trace: jest.fn(),
};

function client(): WebsocketAPIClient {
  const instance = new WebsocketAPIClient(
    {
      accountAddress: '0x1111111111111111111111111111111111111111',
      autoReconnect: false,
      pingInterval: 0,
      privateKey: PRIVATE_KEY,
      requestTimeoutMs: 100,
      testnet: true,
      webSocketConstructor: FakeWebSocket,
    },
    TEST_LOGGER,
  );
  return instance;
}

async function openLatest(): Promise<FakeWebSocket> {
  for (
    let attempt = 0;
    attempt < 20 && FakeWebSocket.instances.length === 0;
    attempt += 1
  ) {
    await Promise.resolve();
  }
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) {
    throw new Error('Expected a WebSocket instance.');
  }
  socket.open();
  return socket;
}

describe('WebsocketAPIClient', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    jest.useRealTimers();
  });

  test('exposes the WebsocketClient that owns its connection', () => {
    const instance = client();

    expect(instance.getWSClient()).toBeInstanceOf(WebsocketClient);
    instance.close();
  });

  test('correlates out-of-order Info responses', async () => {
    const instance = client();
    const first = instance.getAllMids();
    const second = instance.getPerpMetadata();
    const socket = await openLatest();
    await Promise.resolve();
    const requests = socket.jsonMessages() as Array<{
      id: number;
      request: { payload: unknown; type: string };
    }>;

    expect(requests.map((request) => request.request.type)).toEqual([
      'info',
      'info',
    ]);
    socket.message({
      channel: 'post',
      data: {
        id: requests[1]?.id,
        response: {
          payload: { data: { universe: [{ name: 'BTC' }] } },
          type: 'info',
        },
      },
    });
    socket.message({
      channel: 'post',
      data: {
        id: requests[0]?.id,
        response: { payload: { data: { BTC: '100' } }, type: 'info' },
      },
    });

    await expect(first).resolves.toEqual({ BTC: '100' });
    await expect(second).resolves.toEqual({ universe: [{ name: 'BTC' }] });
    instance.close();
  });

  test('checks approval before the first WebSocket order', async () => {
    const instance = client();
    const pending = instance.submitOrder({
      orders: [
        {
          a: 0,
          b: true,
          p: '10.00',
          r: false,
          s: '1.00',
          t: { limit: { tif: 'Gtc' } },
        },
      ],
    });
    const socket = await openLatest();
    let approvalCheck:
      | {
          id: number;
          request: { payload: { type?: string }; type: string };
        }
      | undefined;
    for (let attempt = 0; attempt < 50 && !approvalCheck; attempt += 1) {
      await Promise.resolve();
      approvalCheck = socket.jsonMessages().find(
        (value) =>
          (
            value as {
              request?: { payload?: { type?: string }; type?: string };
            }
          ).request?.payload?.type === 'maxBuilderFee',
      ) as typeof approvalCheck;
    }
    if (!approvalCheck) {
      throw new Error('Expected a maxBuilderFee WebSocket POST request.');
    }

    expect(approvalCheck.request.type).toBe('info');
    socket.message({
      channel: 'post',
      data: {
        id: approvalCheck.id,
        response: {
          payload: { data: PARTNER.builder.f },
          type: 'info',
        },
      },
    });

    let orderRequest:
      | {
          id: number;
          request: {
            payload: {
              action: {
                builder?: unknown;
                orders: Array<{ p: string; s: string }>;
              };
            };
          };
        }
      | undefined;
    for (let attempt = 0; attempt < 50 && !orderRequest; attempt += 1) {
      await Promise.resolve();
      orderRequest = socket.jsonMessages().find(
        (value) =>
          (
            value as {
              request?: {
                payload?: { action?: { type?: string } };
              };
            }
          ).request?.payload?.action?.type === 'order',
      ) as typeof orderRequest;
    }
    if (!orderRequest) {
      throw new Error('Expected an order WebSocket POST request.');
    }

    expect(orderRequest.request.payload.action).toMatchObject({
      builder: PARTNER.builder,
      orders: [{ p: '10', s: '1' }],
    });
    socket.message({
      channel: 'post',
      data: {
        id: orderRequest.id,
        response: {
          payload: { response: { type: 'default' }, status: 'ok' },
          type: 'action',
        },
      },
    });
    await expect(pending).resolves.toMatchObject({ status: 'ok' });

    const second = instance.submitOrder({
      orders: [
        {
          a: 0,
          b: false,
          p: '11',
          r: false,
          s: '2',
          t: { limit: { tif: 'Gtc' } },
        },
      ],
    });
    let taggedRequest:
      | {
          id: number;
          request: {
            payload: { action: { builder?: unknown; type: string } };
          };
        }
      | undefined;
    for (let attempt = 0; attempt < 50 && !taggedRequest; attempt += 1) {
      await Promise.resolve();
      const orderRequests = socket.jsonMessages().filter(
        (value) =>
          (
            value as {
              request?: {
                payload?: { action?: { type?: string } };
              };
            }
          ).request?.payload?.action?.type === 'order',
      );
      taggedRequest = orderRequests[1] as typeof taggedRequest;
    }
    if (!taggedRequest) {
      throw new Error('Expected the second order WebSocket POST request.');
    }
    expect(taggedRequest.request.payload.action.builder).toEqual(
      PARTNER.builder,
    );
    socket.message({
      channel: 'post',
      data: {
        id: taggedRequest.id,
        response: {
          payload: { response: { type: 'default' }, status: 'ok' },
          type: 'action',
        },
      },
    });
    await expect(second).resolves.toMatchObject({ status: 'ok' });
    instance.close();
  });

  test('rejects action errors, malformed replies, and unknown response types', async () => {
    const instance = client();

    const rejected = instance.getAllMids();
    const socket = await openLatest();
    await Promise.resolve();
    const firstId = (socket.jsonMessages()[0] as { id: number }).id;
    socket.message({
      channel: 'post',
      data: {
        id: firstId,
        response: { payload: 'rejected', type: 'error' },
      },
    });
    await expect(rejected).rejects.toBeInstanceOf(HyperliquidWebSocketError);

    const malformed = instance.getAllMids();
    await Promise.resolve();
    const secondId = (socket.jsonMessages()[1] as { id: number }).id;
    socket.message({
      channel: 'post',
      data: { id: secondId, response: {} },
    });
    await expect(malformed).rejects.toThrow('malformed');

    const unknown = instance.getAllMids();
    await Promise.resolve();
    const thirdId = (socket.jsonMessages()[2] as { id: number }).id;
    socket.message({
      channel: 'post',
      data: {
        id: thirdId,
        response: { payload: {}, type: 'future' },
      },
    });
    await expect(unknown).rejects.toThrow('unknown WebSocket POST response');
    instance.close();
  });

  test('correlates server errors that echo a WebSocket POST request', async () => {
    const instance = client();
    const pending = instance.getAllMids();
    const socket = await openLatest();
    await Promise.resolve();
    const request = socket.jsonMessages()[0] as {
      id: number;
      method: string;
      request: unknown;
    };

    socket.message({
      channel: 'error',
      data: `Invalid request ${JSON.stringify(request)}`,
    });

    await expect(pending).rejects.toThrow('Invalid request');
    instance.close();
  });

  test('parses Exchange status err replies consistently with REST', async () => {
    const instance = client();
    const pending = instance.invalidateNonce();
    const socket = await openLatest();
    await Promise.resolve();
    const request = socket
      .jsonMessages()
      .find(
        (value) =>
          (value as { request?: { type?: string } }).request?.type === 'action',
      ) as { id: number };
    socket.message({
      channel: 'post',
      data: {
        id: request.id,
        response: {
          payload: { response: 'bad action', status: 'err' },
          type: 'action',
        },
      },
    });

    await expect(pending).rejects.toBeInstanceOf(HyperliquidApiError);
    await expect(pending).rejects.toMatchObject({ message: 'bad action' });
    instance.close();
  });

  test('supports aborts, timeouts, and close rejection', async () => {
    jest.useFakeTimers();
    const instance = client();
    const controller = new AbortController();
    controller.abort();
    await expect(
      instance.getAllMids({}, { signal: controller.signal }),
    ).rejects.toThrow('aborted');
    expect(FakeWebSocket.instances).toHaveLength(0);

    const timedOut = instance.getAllMids({}, { timeout: 5 });
    await openLatest();
    const timeoutAssertion = expect(timedOut).rejects.toThrow(
      'timed out after 5 ms',
    );
    await jest.advanceTimersByTimeAsync(5);
    await timeoutAssertion;

    const closing = instance.getAllMids();
    await Promise.resolve();
    instance.close();
    await expect(closing).rejects.toThrow('client was closed');
  });

  test('wraps a connection failure as a request send failure', async () => {
    const instance = client();
    const pending = instance.getAllMids();
    await Promise.resolve();
    FakeWebSocket.instances[0]?.error(new Error('connect failed'));

    await expect(pending).rejects.toMatchObject({
      name: 'HyperliquidWebSocketError',
      message: 'Failed to send the Hyperliquid WebSocket request.',
    });
    instance.close();
  });
});
