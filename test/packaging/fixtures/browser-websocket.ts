import { WebsocketAPIClient, WebsocketClient } from '@siebly/hyperliquid-api';

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
