import { AGENT_STATUS_LABEL, MODEL_BY_ID } from '@sothebys/domain';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { decimalComma, euros } from '../utils/format';

/** Colour of the status dot — green while an agent will accept work. */
const DOT: Record<string, string> = {
  ACTIVE: 'var(--ok)',
  PAUSED: 'var(--warn)',
  DRAFT: 'var(--muted)',
};

export function AgentsScreen() {
  const { state, dispatch, actions, can } = useStore();
  const canEdit = can('agents.edit');
  const canDelete = can('agents.delete');

  if (state.agents.length === 0) {
    return (
      <p className="cell-muted">
        {state.loading ? 'A carregar…' : 'Ainda sem agentes. Crie o primeiro acima.'}
      </p>
    );
  }

  return (
    <div className="agent-grid">
      {state.agents.map((agent) => {
        const chips = agent.skillIds
          .map((id) => state.skills.find((skill) => skill.id === id)?.name)
          .filter((name): name is string => !!name);
        const budget =
          agent.limitBudgetCents === 0
            ? 'sem limite'
            : `${euros(agent.spentCents)} / ${euros(agent.limitBudgetCents)} este mês`;

        return (
          <article className="agent-card" key={agent.id}>
            <div className="agent-card__top">
              <div className="status">
                <span className="dot" style={{ background: DOT[agent.status] ?? 'var(--muted)' }} />
                {AGENT_STATUS_LABEL[agent.status]}
              </div>
              <span className="tag">{MODEL_BY_ID[agent.model]?.label ?? agent.model}</span>
            </div>

            <h2 className="agent-card__name">{agent.name}</h2>
            <p className="agent-card__desc">{agent.desc}</p>

            <div className="chip-row agent-card__chips">
              {chips.map((chip) => (
                <span className="chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>

            <div className="agent-card__foot">
              <div className="agent-card__meta">
                {agent.runCount} exec. · temp {decimalComma(agent.temp)} · {budget}
              </div>
              <div className="row-actions">
                {canEdit && (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => void actions.toggleAgentStatus(agent)}
                  >
                    {agent.status === 'ACTIVE' ? 'Pausar' : 'Ativar'}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => dispatch({ type: 'drawer/open', kind: 'agent', id: agent.id })}
                  >
                    Configurar
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="link-action link-action--danger"
                    onClick={() =>
                      dispatch({
                        type: 'confirm/request',
                        text: messages.confirmDeleteAgent(agent.name),
                        intent: { kind: 'deleteAgent', id: agent.id },
                      })
                    }
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
