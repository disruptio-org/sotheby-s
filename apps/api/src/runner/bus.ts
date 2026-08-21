import type { RunEvent } from '@sothebys/domain';
import { EventEmitter } from 'node:events';

/**
 * In-process fan-out of run progress to any SSE listeners. Single-node only —
 * moving the worker to its own process means swapping this for Redis pub/sub or
 * Postgres LISTEN/NOTIFY, with the same `publish` / `subscribe` shape.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const channel = (runId: number) => `run:${runId}`;

export const publish = (event: RunEvent): void => {
  const runId = 'run' in event ? event.run.id : event.runId;
  emitter.emit(channel(runId), event);
};

export const subscribe = (runId: number, listener: (event: RunEvent) => void): (() => void) => {
  emitter.on(channel(runId), listener);
  return () => emitter.off(channel(runId), listener);
};
