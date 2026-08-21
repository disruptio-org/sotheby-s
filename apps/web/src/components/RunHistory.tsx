import { RUN_STATUS_LABEL, type RunDto } from '@sothebys/domain';
import { duration, eurosExact, timestamp } from '../utils/format';
import { useStore } from '../state/store';

const TONE: Record<RunDto['status'], string> = {
  QUEUED: 'var(--muted)',
  RUNNING: 'var(--heading)',
  SUCCEEDED: 'var(--ok)',
  FAILED: 'var(--danger)',
  CANCELED: 'var(--warn)',
};

/** Past executions of one workflow — the billing trail, newest first. */
export function RunHistory({ workflowId }: { workflowId: number }) {
  const { state, dispatch } = useStore();
  const runs = state.runs.filter((run) => run.workflowId === workflowId);

  if (runs.length === 0) return null;

  return (
    <div className="run-history">
      <div className="run-history__title">Execuções recentes</div>
      {runs.slice(0, 8).map((run) => (
        <button
          key={run.id}
          type="button"
          className="run-history__row"
          onClick={() => dispatch({ type: 'run/watch', run })}
        >
          <span className="run-history__dot" style={{ background: TONE[run.status] }} />
          <span className="run-history__status">{RUN_STATUS_LABEL[run.status]}</span>
          <span className="run-history__when">{timestamp(run.createdAt)}</span>
          <span className="run-history__meta">
            {duration(run.startedAt, run.finishedAt)} · {eurosExact(run.costCents)}
          </span>
        </button>
      ))}
    </div>
  );
}
