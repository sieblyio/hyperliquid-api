import { EventEmitter as NodeEventEmitter } from 'node:events';

import type { EventEmitterConstructor } from '../types/websockets/ws-portable.js';

const RuntimeEventEmitter =
  NodeEventEmitter as unknown as EventEmitterConstructor;

/** Node adapter, following the shared SDK runtime boundary. */
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown[] },
> extends RuntimeEventEmitter<TEvents> {}
