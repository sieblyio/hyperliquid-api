import {
  WebsocketAPIClient,
  WebsocketClient,
  type WebSocketLike,
  type WebsocketMessageEvent,
  type WebsocketResponseEvent,
} from '@siebly/hyperliquid-api';

/** Browser fixture with no socket opened during import. */
export function createClients(): {
  api: WebsocketAPIClient;
  subscriptions: WebsocketClient;
} {
  return {
    api: new WebsocketAPIClient(),
    subscriptions: new WebsocketClient(),
  };
}

/** Runs unchanged against Node and browser package exports without network I/O. */
export async function exerciseWebsocket(): Promise<void> {
  const sockets: FixtureSocket[] = [];
  class FixtureSocket implements WebSocketLike {
    readyState = 0;
    onopen: WebSocketLike['onopen'] = null;
    onclose: WebSocketLike['onclose'] = null;
    onerror: WebSocketLike['onerror'] = null;
    onmessage: WebSocketLike['onmessage'] = null;
    sent: string[] = [];

    constructor(_url: string) {
      sockets.push(this);
    }

    send(data: string): void {
      this.sent.push(data);
    }

    close(): void {
      this.readyState = 3;
    }
  }

  function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
  }

  const client = new WebsocketClient({
    webSocketConstructor: FixtureSocket,
    pingInterval: 0,
    autoReconnect: false,
  });
  check(sockets.length === 0, 'Constructing a client opened a socket');
  const messages: WebsocketMessageEvent[] = [];
  const responses: WebsocketResponseEvent[] = [];
  let onceCalls = 0;
  const once = () => onceCalls++;
  const listener = (event: WebsocketMessageEvent) => messages.push(event);
  client.once('message', once).off('message', once);
  client.on('message', listener).on('message', listener);
  check(
    client.listenerCount('message', listener) === 2,
    'Duplicate listeners were lost',
  );
  client.off('message', listener);
  check(
    client.listenerCount('message', listener) === 1,
    'off removed the wrong listener count',
  );
  check(
    client.listenerCount('message', once) === 0,
    'off did not remove a once listener',
  );
  client.once('message', once).on('response', (event) => responses.push(event));

  try {
    const topic = { type: 'trades', coin: 'BTC' } as const;
    const subscribing = client.subscribe([
      topic,
      { coin: 'BTC', type: 'trades' },
    ]);
    const socket = sockets[0];
    check(socket, 'subscribe did not open a socket');
    socket.readyState = 1;
    socket.onopen?.();
    await subscribing;
    check(socket.sent.length === 1, 'Equivalent topics were sent twice');
    socket.onmessage?.({
      data: JSON.stringify({
        channel: 'subscriptionResponse',
        data: { method: 'subscribe', subscription: topic },
      }),
    });
    for (let index = 0; index < 2; index++) {
      socket.onmessage?.({
        data: JSON.stringify({ channel: 'trades', data: [] }),
      });
    }
    check(messages.length === 2, 'Expected one message event per update');
    check(
      messages.every(
        (event) =>
          event.channel === 'trades' &&
          event.wsKey === 'public' &&
          Array.isArray(event.data),
      ),
      'The message envelope was lost',
    );
    check(
      responses.length === 1 &&
        responses[0]?.channel === 'subscriptionResponse' &&
        responses[0].wsKey === 'public',
      'Subscription acknowledgement was lost',
    );
    check(onceCalls === 1, 'once fired more than once');
    await client.unsubscribe({ coin: 'BTC', type: 'trades' });
    check(
      JSON.parse(socket.sent[1] ?? '{}').method === 'unsubscribe',
      'unsubscribe did not send a wire request',
    );
    check(
      client.listenerCount('message', listener) === 1,
      'unsubscribe changed listeners',
    );
    client.removeAllListeners();
    check(
      client.eventNames().length === 0,
      'removeAllListeners left listeners behind',
    );
  } finally {
    client.closeAll();
  }
}
