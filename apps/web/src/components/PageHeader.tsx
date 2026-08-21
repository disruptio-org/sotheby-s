import type { PermissionKey, SectionId } from '@sothebys/domain';
import { useStore } from '../state/store';
import type { DrawerKind } from '../state/types';
import { SECTION_META } from '../ui/sections';

/** The create action offered in the page header, per section. */
const PRIMARY_ACTION: Partial<
  Record<SectionId, { label: string; permission: PermissionKey; drawer: DrawerKind }>
> = {
  agents: { label: 'Novo Agente', permission: 'agents.create', drawer: 'agent' },
  skills: { label: 'Nova Skill', permission: 'skills.create', drawer: 'skill' },
  workflows: { label: 'Novo Workflow', permission: 'workflows.create', drawer: 'workflow' },
  users: { label: 'Convidar Utilizador', permission: 'users.create', drawer: 'user' },
  roles: { label: 'Novo Perfil', permission: 'roles.create', drawer: 'role' },
};

export function PageHeader({ section }: { section: SectionId }) {
  const { dispatch, can } = useStore();
  const meta = SECTION_META[section];
  const action = PRIMARY_ACTION[section];
  const showAction = action !== undefined && can(action.permission);

  return (
    <header className="page__header">
      <div>
        <div className="page__kicker">{meta.group}</div>
        <h1 className="page__title">{meta.title}</h1>
        <p className="page__desc">{meta.desc}</p>
      </div>
      <div className="page__actions">
        {showAction && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => dispatch({ type: 'drawer/open', kind: action.drawer })}
          >
            {action.label}
          </button>
        )}
      </div>
    </header>
  );
}
