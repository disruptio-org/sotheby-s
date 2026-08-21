import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { decimalComma } from '../utils/format';

export function AgentsScreen() {
  const { state, dispatch, can } = useStore();
  const canRun = can('agents.run');
  const canEdit = can('agents.edit');
  const canDelete = can('agents.delete');

  const skillName = (id: number) => state.skills.find((skill) => skill.id === id)?.name;

  return (
    <div className="agent-grid">
      {state.agents.map((agent) => {
        const chips = agent.skillIds.map(skillName).filter((name): name is string => !!name);
        return (
          <article className="agent-card" key={agent.id}>
            <div className="agent-card__top">
              <div className="status">
                <span
                  className="dot"
                  style={{ background: agent.status === 'Ativo' ? 'var(--ok)' : 'var(--warn)' }}
                />
                {agent.status}
              </div>
              <span className="tag">{agent.model}</span>
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
                {agent.runs} exec. · temp {decimalComma(agent.temp)} · {agent.limitBudget}€/mês
              </div>
              <div className="row-actions">
                {canRun && (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() =>
                      dispatch({
                        type: 'toast/push',
                        message: messages.agentQueued(agent.name, agent.model),
                      })
                    }
                  >
                    Testar
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
                    onClick={() => dispatch({ type: 'agents/requestDelete', id: agent.id })}
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
