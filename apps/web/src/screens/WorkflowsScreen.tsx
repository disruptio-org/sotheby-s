import {
  MODEL_BY_ID,
  RUN_STATUS_LABEL,
  SKILL_CATEGORY_LABEL,
  type RunStepDto,
  type RunStepStatus,
} from '@sothebys/domain';
import { Fragment, useState } from 'react';
import { ArrowTipIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../components/icons';
import { RunHistory } from '../components/RunHistory';
import { OUTPUT_PREVIEW_CHARS } from '../config';
import { messages } from '../state/messages';
import { selectors } from '../state/reducer';
import { useStore } from '../state/store';
import { duration, eurosExact, plural, stepNumber } from '../utils/format';

const STEP_LABEL: Record<RunStepStatus, string> = {
  PENDING: 'Em fila',
  RUNNING: 'A executar',
  SUCCEEDED: 'Concluído',
  FAILED: 'Falhou',
  SKIPPED: 'Ignorado',
};

const STEP_COLOR: Record<RunStepStatus, string> = {
  PENDING: 'var(--muted-light)',
  RUNNING: 'var(--heading)',
  SUCCEEDED: 'var(--ok)',
  FAILED: 'var(--danger)',
  SKIPPED: 'var(--muted-light)',
};

function Connector() {
  return (
    <div className="connector" aria-hidden>
      <div className="connector__line" />
      <ArrowTipIcon />
    </div>
  );
}

/** The result of one executed step, expandable when the output is long. */
function StepResult({ step }: { step: RunStepDto }) {
  const [expanded, setExpanded] = useState(false);

  if (step.error) return <p className="step-output step-output--error">{step.error}</p>;
  if (!step.output) return null;

  const long = step.output.length > OUTPUT_PREVIEW_CHARS;
  const text = expanded || !long ? step.output : `${step.output.slice(0, OUTPUT_PREVIEW_CHARS)}…`;

  return (
    <div className="step-output">
      <p className="step-output__text">{text}</p>
      <div className="step-output__foot">
        <span>
          {step.tokensIn + step.tokensOut} tokens · {eurosExact(step.costCents)} ·{' '}
          {duration(step.startedAt, step.finishedAt)}
        </span>
        {long && (
          <button type="button" className="link-action" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Mostrar menos' : 'Ver tudo'}
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkflowsScreen() {
  const { state, dispatch, actions, can } = useStore();
  const canEdit = can('workflows.edit');
  const canRun = can('workflows.run');
  const canDelete = can('workflows.delete');

  const workflow = selectors.selectedWorkflow(state);
  const agent = workflow ? selectors.agentOf(state, workflow.agentId) : undefined;
  const steps = workflow?.steps ?? [];

  const run = workflow && state.activeRun?.workflowId === workflow.id ? state.activeRun : null;
  const live = run !== null && (run.status === 'QUEUED' || run.status === 'RUNNING');
  const stepOf = (index: number): RunStepDto | undefined =>
    run?.steps.find((step) => step.index === index);

  /** Persists a new step order; the server is the source of truth after this. */
  const setSteps = (next: number[]) => {
    if (!workflow) return;
    void actions.patchWorkflow(workflow.id, { steps: next });
  };

  const move = (index: number, delta: number) => {
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    if (moved !== undefined) next.splice(index + delta, 0, moved);
    setSteps(next);
  };

  return (
    <div className="split">
      <div className="list-stack">
        {state.workflows.map((item) => {
          const itemAgent = selectors.agentOf(state, item.agentId);
          const active = workflow?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              className={`list-card${active ? ' list-card--active' : ''}`}
              onClick={() => dispatch({ type: 'workflow/select', id: item.id })}
            >
              <div className="list-card__title">{item.name}</div>
              <div className="list-card__meta">
                {plural(item.steps.length, 'passo', 'passos')} ·{' '}
                {itemAgent ? itemAgent.name : 'Sem agente'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">{workflow ? workflow.name : 'Sem workflows'}</h2>
            <div className="panel__sub">
              {workflow ? `${plural(steps.length, 'passo', 'passos')} em sequência` : ''}
            </div>
          </div>
          <div className="panel__actions">
            {canDelete && workflow && (
              <button
                type="button"
                className="link-action link-action--danger"
                onClick={() =>
                  dispatch({
                    type: 'confirm/request',
                    text: messages.confirmDeleteWorkflow(workflow.name),
                    intent: { kind: 'deleteWorkflow', id: workflow.id },
                  })
                }
              >
                Eliminar
              </button>
            )}
            {canRun && run && live && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void actions.cancelRun(run.id)}
              >
                Cancelar
              </button>
            )}
            {canRun && workflow && (
              <button
                type="button"
                className="btn btn--primary btn--run"
                disabled={live || state.runBusy || steps.length === 0}
                onClick={() => void actions.startRun(workflow.id)}
              >
                {live && run ? RUN_STATUS_LABEL[run.status] : 'Executar workflow'}
              </button>
            )}
          </div>
        </div>

        {canRun && workflow && (
          <div className="run-launcher">
            <label className="field__label" htmlFor="run-input">
              Contexto para o primeiro passo
            </label>
            <textarea
              id="run-input"
              className="textarea"
              rows={3}
              placeholder="Ex.: Apartamento T3 no Príncipe Real, 180 m², varanda, vista de cidade."
              value={state.runInput}
              disabled={live}
              onChange={(event) => dispatch({ type: 'run/setInput', value: event.target.value })}
            />
            {run && !live && (
              <div className="run-summary">
                <span>
                  {RUN_STATUS_LABEL[run.status]} · {duration(run.startedAt, run.finishedAt)} ·{' '}
                  {run.tokensIn + run.tokensOut} tokens · {eurosExact(run.costCents)}
                </span>
                <button
                  type="button"
                  className="link-action"
                  onClick={() => dispatch({ type: 'run/clear' })}
                >
                  Limpar
                </button>
              </div>
            )}
            {run?.error && <p className="run-summary__error">{run.error}</p>}
          </div>
        )}

        <div className="canvas">
          <div className="node-agent">
            <div className="node-agent__label">Agente executor</div>
            {canEdit && workflow ? (
              <select
                className="select--dark"
                aria-label="Agente executor"
                value={String(workflow.agentId)}
                disabled={live}
                onChange={(event) =>
                  void actions.patchWorkflow(workflow.id, { agentId: Number(event.target.value) })
                }
              >
                {state.agents.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="node-agent__name">{agent ? agent.name : 'Sem agente'}</div>
            )}
            <div className="node-agent__model">
              {agent ? (MODEL_BY_ID[agent.model]?.label ?? agent.model) : ''}
            </div>
          </div>

          {steps.map((skillId, index) => {
            const skill = selectors.skillOf(state, skillId);
            const executed = stepOf(index);
            const status = executed?.status;
            const modifier =
              status === 'RUNNING'
                ? ' step-card--running'
                : status === 'SUCCEEDED'
                  ? ' step-card--done'
                  : status === 'FAILED'
                    ? ' step-card--failed'
                    : '';

            return (
              <Fragment key={`${skillId}-${index}`}>
                <Connector />
                <div className={`step-card${modifier}`}>
                  <div className="step-card__head">
                    <div className="step-card__num">{stepNumber(index)}</div>
                    <div className="step-card__cat">
                      {skill ? SKILL_CATEGORY_LABEL[skill.cat] : '—'}
                    </div>
                  </div>
                  <div className="step-card__name">{skill ? skill.name : '(skill eliminada)'}</div>

                  {status && (
                    <div
                      className={`step-status step-status--${status.toLowerCase()}`}
                      style={{ color: STEP_COLOR[status] }}
                    >
                      <span className="step-status__dot" />
                      {STEP_LABEL[status]}
                    </div>
                  )}

                  {executed && <StepResult step={executed} />}

                  {canEdit && !live && (
                    <div className="step-card__tools">
                      <button
                        type="button"
                        className="mini-btn"
                        title="Mover para trás"
                        aria-label="Mover para trás"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronLeftIcon />
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        title="Mover para a frente"
                        aria-label="Mover para a frente"
                        disabled={index === steps.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronRightIcon />
                      </button>
                      <button
                        type="button"
                        className="mini-btn mini-btn--remove"
                        title="Remover passo"
                        aria-label="Remover passo"
                        onClick={() => setSteps(steps.filter((_, at) => at !== index))}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}

          {canEdit && workflow && !live && (
            <>
              <Connector />
              <div className="step-add">
                <select
                  className="select--bare"
                  aria-label="Adicionar passo"
                  value=""
                  onChange={(event) => {
                    const skillId = Number(event.target.value);
                    if (skillId) setSteps([...steps, skillId]);
                  }}
                >
                  <option value="">+ Adicionar passo…</option>
                  {state.skills.map((skill) => (
                    <option key={skill.id} value={String(skill.id)}>
                      {skill.name} — {SKILL_CATEGORY_LABEL[skill.cat]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {!canEdit && workflow && steps.length === 0 && (
            <div className="canvas__empty">Este workflow ainda não tem passos.</div>
          )}
        </div>

        {workflow && <RunHistory workflowId={workflow.id} />}
      </div>
    </div>
  );
}
