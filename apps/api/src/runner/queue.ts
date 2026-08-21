import { env } from '../env.js';

type Job = () => Promise<void>;

const pending: { runId: number; job: Job }[] = [];
const active = new Map<number, AbortController>();

let onError: (runId: number, error: unknown) => void = () => {};

export const setQueueErrorHandler = (handler: typeof onError): void => {
  onError = handler;
};

const pump = (): void => {
  while (active.size < env.RUN_CONCURRENCY && pending.length > 0) {
    const next = pending.shift();
    if (!next) return;

    const controller = new AbortController();
    active.set(next.runId, controller);

    void next
      .job()
      .catch((error: unknown) => onError(next.runId, error))
      .finally(() => {
        active.delete(next.runId);
        pump();
      });
  }
};

/** Queues a run. Returns false if that run is already queued or executing. */
export const enqueue = (runId: number, job: Job): boolean => {
  if (active.has(runId) || pending.some((item) => item.runId === runId)) return false;
  pending.push({ runId, job });
  pump();
  return true;
};

/** Cancellation signal for a run currently executing, if any. */
export const signalFor = (runId: number): AbortSignal | undefined => active.get(runId)?.signal;

export const cancel = (runId: number): boolean => {
  const controller = active.get(runId);
  if (controller) {
    controller.abort();
    return true;
  }
  const index = pending.findIndex((item) => item.runId === runId);
  if (index >= 0) {
    pending.splice(index, 1);
    return true;
  }
  return false;
};

export const queueDepth = (): { active: number; pending: number } => ({
  active: active.size,
  pending: pending.length,
});
