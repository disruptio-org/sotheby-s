import { SKILL_CATEGORY_LABEL, type SkillDto } from '@sothebys/domain';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { plural, shortDate } from '../utils/format';

export function SkillsScreen() {
  const { state, dispatch, can } = useStore();
  const canEdit = can('skills.edit');
  const canDelete = can('skills.delete');

  const usedBy = (skill: SkillDto) => {
    const agents = state.agents.filter((a) => a.skillIds.includes(skill.id)).length;
    const workflows = state.workflows.filter((w) => w.steps.includes(skill.id)).length;
    return `${plural(agents, 'agente', 'agentes')} · ${plural(workflows, 'workflow', 'workflows')}`;
  };

  return (
    <div className="section">
      <div className="table table--skills">
        <div className="table__head">
          <div>Skill</div>
          <div>Categoria</div>
          <div>Utilizada em</div>
          <div>Atualizada</div>
          <div />
        </div>

        {state.skills.map((skill) => (
          <div className="table__row" key={skill.id}>
            <div>
              <div className="cell-title">{skill.name}</div>
              <div className="cell-sub">{skill.desc}</div>
            </div>
            <div>
              <span className="tag">{SKILL_CATEGORY_LABEL[skill.cat]}</span>
            </div>
            <div className="cell-muted">{usedBy(skill)}</div>
            <div className="cell-muted">{shortDate(skill.updatedAt)}</div>
            <div className="cell-actions">
              {canEdit && (
                <button
                  type="button"
                  className="link-action"
                  onClick={() => dispatch({ type: 'drawer/open', kind: 'skill', id: skill.id })}
                >
                  Editar
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="link-action link-action--danger"
                  onClick={() =>
                    dispatch({
                      type: 'confirm/request',
                      text: messages.confirmDeleteSkill(skill.name),
                      intent: { kind: 'deleteSkill', id: skill.id },
                    })
                  }
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
