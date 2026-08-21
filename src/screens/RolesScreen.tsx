import { CheckIcon } from '../components/icons';
import { PERMISSION_MODULES, permissionKey } from '../domain/permissions';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { plural } from '../utils/format';

export function RolesScreen() {
  const { state, dispatch, can } = useStore();
  const canEditPerms = can('roles.edit');
  const canDeleteRole = can('roles.delete');

  const role = state.roles.find((r) => r.id === state.selectedRoleId) ?? state.roles[0];
  const locked = !role || role.system || !canEditPerms;
  const assigned = role ? state.users.filter((u) => u.roleId === role.id) : [];

  const hint = locked
    ? role?.system
      ? 'Perfil de sistema — as permissões estão bloqueadas.'
      : 'Só de leitura — falta-lhe a permissão «Editar permissões».'
    : 'Clique numa permissão para a alternar. As alterações aplicam-se de imediato.';

  return (
    <div className="split">
      <div className="list-stack">
        {state.roles.map((item) => {
          const count = state.users.filter((u) => u.roleId === item.id).length;
          const active = role?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              className={`list-card${active ? ' list-card--active' : ''}`}
              onClick={() => dispatch({ type: 'role/select', id: item.id })}
            >
              <div className="list-card__head">
                <div className="list-card__title">{item.name}</div>
                {item.system && <span className="badge-system">Sistema</span>}
              </div>
              <div className="list-card__desc">{item.desc}</div>
              <div className="list-card__count">
                {plural(count, 'utilizador', 'utilizadores')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="panel panel--roles">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">{role?.name ?? ''}</h2>
            <p className="panel__desc">{role?.desc ?? ''}</p>
          </div>
          <div className="panel__actions">
            {role && !role.system && canEditPerms && (
              <button
                type="button"
                className="link-action"
                onClick={() => dispatch({ type: 'drawer/open', kind: 'role', id: role.id })}
              >
                Renomear
              </button>
            )}
            {role && !role.system && canDeleteRole && (
              <button
                type="button"
                className="link-action link-action--danger"
                onClick={() => dispatch({ type: 'role/requestDelete' })}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>

        <div className="perm-header">
          <div className="section-label">Permissões</div>
          <div className="perm-hint">{hint}</div>
        </div>

        {PERMISSION_MODULES.map((module) => (
          <div className="perm-module" key={module.id}>
            <div className="perm-module__label">{module.label}</div>
            <div className="chip-row">
              {module.actions.map((action) => {
                const key = permissionKey(module.id, action.id);
                const on = !!role?.perms[key];
                const className = [
                  'toggle-chip',
                  on ? 'toggle-chip--on' : '',
                  locked ? 'toggle-chip--locked' : '',
                  locked && !on ? 'toggle-chip--dim' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    className={className}
                    onClick={() => {
                      if (locked) {
                        if (role?.system) {
                          dispatch({ type: 'toast/push', message: messages.roleLocked });
                        }
                        return;
                      }
                      dispatch({ type: 'role/togglePermission', key });
                    }}
                  >
                    <span className="checkbox">{on && <CheckIcon stroke="#FFFFFF" />}</span>
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="role-users">
          <div className="section-label role-users__label">Utilizadores com este perfil</div>
          <div className="chip-row">
            {assigned.map((user) => (
              <span className="chip chip--lg" key={user.id}>
                {user.name}
              </span>
            ))}
            {assigned.length === 0 && (
              <span className="role-users__empty">Ainda sem utilizadores atribuídos.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
