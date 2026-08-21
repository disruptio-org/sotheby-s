import { USER_STATUS_LABEL, type UserStatus } from '@sothebys/domain';
import { messages } from '../state/messages';
import { useStore } from '../state/store';
import { initials, timestamp } from '../utils/format';

const STATUS_COLOR: Record<UserStatus, string> = {
  ACTIVE: 'var(--ok)',
  INVITED: 'var(--warn)',
  SUSPENDED: 'var(--danger)',
};

export function UsersScreen() {
  const { state, dispatch, actions, can } = useStore();
  const canEdit = can('users.edit');
  const canReset = can('users.reset');
  const canDelete = can('users.delete');
  const meId = state.session?.user.id ?? null;

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
          const isMe = user.id === meId;

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
                {canEdit && !isMe ? (
                  <select
                    className="select select--inline"
                    aria-label={`Perfil de ${user.name}`}
                    value={String(user.roleId)}
                    onChange={(event) =>
                      void actions.changeUserRole(user, Number(event.target.value))
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
                {USER_STATUS_LABEL[user.status]}
              </div>

              <div className="cell-muted">{timestamp(user.lastLoginAt)}</div>

              <div className="cell-actions cell-actions--users">
                {canReset && (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() =>
                      dispatch({
                        type: 'confirm/request',
                        text: messages.confirmResetPassword(user.name),
                        intent: { kind: 'resetPassword', id: user.id },
                      })
                    }
                  >
                    {user.status === 'INVITED' ? 'Gerar acesso' : 'Repor palavra-passe'}
                  </button>
                )}
                {canEdit && !isMe && (
                  <button
                    type="button"
                    className="link-action link-action--quiet"
                    onClick={() => void actions.toggleUserSuspended(user)}
                  >
                    {user.status === 'SUSPENDED' ? 'Reativar' : 'Suspender'}
                  </button>
                )}
                {canDelete && !isMe && (
                  <button
                    type="button"
                    className="link-action link-action--danger"
                    onClick={() =>
                      dispatch({
                        type: 'confirm/request',
                        text: messages.confirmDeleteUser(user.name),
                        intent: { kind: 'deleteUser', id: user.id },
                      })
                    }
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
