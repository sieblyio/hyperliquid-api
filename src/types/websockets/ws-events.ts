import type { WsKey } from './ws-general.js';
import type {
  AssetContextEvent,
  UserEvent,
  WebsocketSubscription,
  WebsocketSubscriptionData,
} from './ws-subscriptions.js';

export type WebsocketChannel =
  | Exclude<keyof WebsocketSubscriptionData, 'userEvents'>
  | 'activeSpotAssetCtx'
  | 'user';

/** The original wire envelope, with its physical connection identified by wsKey. */
export type WebsocketMessageEvent<TWsKey extends string = WsKey> = {
  [K in WebsocketChannel]: {
    channel: K;
    data: K extends 'user'
      ? UserEvent
      : K extends 'activeSpotAssetCtx'
        ? AssetContextEvent
        : WebsocketSubscriptionData[K & keyof WebsocketSubscriptionData];
    wsKey: TWsKey;
  };
}[WebsocketChannel];

export interface WebsocketSubscriptionResponseEvent<
  TWsKey extends string = WsKey,
> {
  channel: 'subscriptionResponse';
  data: {
    method: 'subscribe' | 'unsubscribe';
    subscription: WebsocketSubscription;
  };
  wsKey: TWsKey;
}

export interface WebsocketPostResponseEvent<TWsKey extends string = WsKey> {
  channel: 'post';
  data: {
    id: number;
    response: {
      type: 'action' | 'error' | 'info';
      payload: unknown;
    };
  };
  wsKey: TWsKey;
}

export type WebsocketResponseEvent<TWsKey extends string = WsKey> =
  | WebsocketSubscriptionResponseEvent<TWsKey>
  | WebsocketPostResponseEvent<TWsKey>;
