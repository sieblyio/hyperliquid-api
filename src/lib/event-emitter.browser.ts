// @ts-expect-error -- the browser implementation is typed through our portable contract.
import BrowserEventEmitter from 'events/events.js';

import type { EventEmitterConstructor } from '../types/websockets/ws-portable.js';

const RuntimeEventEmitter =
  BrowserEventEmitter as unknown as EventEmitterConstructor;

/** Browser adapter backed by the same established emitter package as HTX. */
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown[] },
> extends RuntimeEventEmitter<TEvents> {
  override listenerCount<K extends keyof TEvents>(
    event: K,
    listener?: (...args: TEvents[K]) => void,
  ): number {
    return listener
      ? this.listeners(event).filter((registered) => registered === listener)
          .length
      : super.listenerCount(event);
  }
}
