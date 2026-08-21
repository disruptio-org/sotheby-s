import { Fragment } from 'react';
import { useStore } from '../state/store';
import { plural, stepNumber } from '../utils/format';
import { ArrowTipIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../components/icons';

type StepStatus = 'idle' | 'pending' | 'running' | 'done';

const STATUS_LABEL: Record<Exclude<StepStatus, 'idle'>, string> = {
  running: 'A executar',
  done: 'Concluído',
  pending: 'Em fila',
};

const STATUS_COLOR: Record<Exclude<StepStatus, 'idle'>, string> = {
  running: 'var(--heading)',
  done: 'var(--ok)',
  pending: 'var(--muted-light)',
};

function Connector() {
  return (
    <div className="connector" aria-hidden>
      <div className="connector__line" />
      <ArrowTipIcon />
    </div>
  );
}

export function WorkflowsScreen() {
  const { state, dispatch, can } = useStore();
  const canEdit = can('workflows.edit');
  const canRun = can('workflows.run');
  const canDelete = can('workflows.delete');

  const workflow =
    state.workflows.find((w) => w.id === state.selectedWorkflowId) ?? state.workflows[0];
  const agent = workflow ? state.agents.find((a) => a.id === workflow.agentId) : undefined;
  const run = workflow && state.run?.workflowId === workflow.id ? state.run : null;
  const isRunning = run !== null;

  const statusOf = (index: number): StepStatus => {
    if (!run) return 'idle';
    if (run.done || index < run.index) return 'done';
    return index === run.index ? 'running' : 'pending';
  };

  const steps = workflow?.steps ?? [];

  return (
    <div className="split">
      <div className="list-stack">
        {state.workflows.map((item) => {
          const itemAgent = state.agents.find((a) => a.id === item.agentId);
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
                onClick={() => dispatch({ type: 'workflow/requestDelete' })}
              >
                Eliminar
              </button>
            )}
            {canRun && workflow && (
              <button
                type="button"
                className="btn btn--primary btn--run"
                style={{ opacity: isRunning ? 0.55 : 1 }}
                onClick={() => dispatch({ type: 'run/start', workflowId: workflow.id })}
              >
                {isRunning ? 'A executar…' : 'Executar workflow'}
              </button>
            )}
          </div>
        </div>

        <div className="canvas">
          <div className="node-agent">
            <div className="node-agent__label">Agente executor</div>
            {canEdit && workflow ? (
              <select
                className="select--dark"
                aria-label="Agente executor"
                value={String(workflow.agentId)}
                onChange={(event) =>
                  dispatch({ type: 'workflow/setAgent', agentId: Number(event.target.value) })
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
            <div className="node-agent__model">{agent ? agent.model : ''}</div>
          </div>

          {steps.map((skillId, index) => {
            const skill = state.skills.find((s) => s.id === skillId);
            const status = statusOf(index);
            const modifier =
              status === 'running' ? ' step-card--running' : status === 'done' ? ' step-card--done' : '';

            return (
              <Fragment key={`${skillId}-${index}`}>
                <Connector />
                <div className={`step-card${modifier}`}>
                  <div className="step-card__head">
                    <div className="step-card__num">{stepNumber(index)}</div>
                    <div className="step-card__cat">{skill ? skill.cat : '—'}</div>
                  </div>
                  <div className="step-card__name">
                    {skill ? skill.name : '(skill eliminada)'}
                  </div>

                  {status !== 'idle' && (
                    <div
                      className={`step-status step-status--${status}`}
                      style={{ color: STATUS_COLOR[status] }}
                    >
                      <span className="step-status__dot" />
                      {STATUS_LABEL[status]}
                    </div>
                  )}

                  {canEdit && (
                    <div className="step-card__tools">
                      <button
                        type="button"
                        className="mini-btn"
                        title="Mover para trás"
                        aria-label="Mover para trás"
                        disabled={index === 0}
                        onClick={() => dispatch({ type: 'workflow/moveStep', index, delta: -1 })}
                      >
                        <ChevronLeftIcon />
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        title="Mover para a frente"
                        aria-label="Mover para a frente"
                        disabled={index === steps.length - 1}
                        onClick={() => dispatch({ type: 'workflow/moveStep', index, delta: 1 })}
                      >
                        <ChevronRightIcon />
                      </button>
                      <button
                        type="button"
                        className="mini-btn mini-btn--remove"
                        title="Remover passo"
                        aria-label="Remover passo"
                        onClick={() => dispatch({ type: 'workflow/removeStep', index })}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}

          {canEdit && workflow && (
            <>
              <Connector />
              <div className="step-add">
                <select
                  className="select--bare"
                  aria-label="Adicionar passo"
                  value=""
                  onChange={(event) => {
                    const skillId = Number(event.target.value);
                    if (skillId) dispatch({ type: 'workflow/addStep', skillId });
                  }}
                >
                  <option value="">+ Adicionar passo…</option>
                  {state.skills.map((skill) => (
                    <option key={skill.id} value={String(skill.id)}>
                      {skill.name} — {skill.cat}
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
      </div>
    </div>
  );
}
