import type { UserStatus } from '../domain/types';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { initials } from '../utils/format';

const STATUS_COLOR: Record<UserStatus, string> = {
  Ativo: 'var(--ok)',
  Convidado: 'var(--warn)',
  Suspenso: 'var(--danger)',
};

export function UsersScreen() {
  const { state, dispatch, can } = useStore();
  const canEdit = can('users.edit');
  const canReset = can('users.reset');
  const canDelete = can('users.delete');

  return (
    <div className="section">
      <div className="table table--users">
        <div className="table__head">
          <div>Utilizador</div>
          <div>Perfil</div>
          <div>Estado</div>
          <div>Último acesso</div>
          <div />
        </div>

        {state.users.map((user) => {
          const role = state.roles.find((r) => r.id === user.roleId);
          const isMe = user.id === state.currentUserId;

          return (
            <div className="table__row" key={user.id}>
              <div className="user-cell">
                <div className="user-avatar" aria-hidden>
                  {initials(user.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-title">
                    {user.name} {isMe && <span className="user-cell__me">(você)</span>}
                  </div>
                  <div className="user-cell__email">{user.email}</div>
                </div>
              </div>

              <div>
                {canEdit ? (
                  <select
                    className="select select--inline"
                    aria-label={`Perfil de ${user.name}`}
                    value={String(user.roleId)}
                    onChange={(event) =>
                      dispatch({
                        type: 'user/changeRole',
                        userId: user.id,
                        roleId: Number(event.target.value),
                      })
                    }
                  >
                    {state.roles.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '12.5px', color: 'var(--muted-deep)' }}>
                    {role ? role.name : '—'}
                  </span>
                )}
              </div>

              <div className="status status--user">
                <span className="dot" style={{ background: STATUS_COLOR[user.status] }} />
                {user.status}
              </div>

              <div className="cell-muted">{user.last}</div>

              <div className="cell-actions cell-actions--users">
                {canReset && (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() =>
                      dispatch({
                        type: 'toast/push',
                        message: messages.passwordResetSent(user.email),
                      })
                    }
                  >
                    Repor palavra-passe
                  </button>
                )}
                {canEdit && !isMe && (
                  <button
                    type="button"
                    className="link-action link-action--quiet"
                    onClick={() => dispatch({ type: 'user/toggleSuspend', userId: user.id })}
                  >
                    {user.status === 'Suspenso' ? 'Reativar' : 'Suspender'}
                  </button>
                )}
                {canDelete && !isMe && (
                  <button
                    type="button"
                    className="link-action link-action--danger"
                    onClick={() => dispatch({ type: 'users/requestDelete', id: user.id })}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
