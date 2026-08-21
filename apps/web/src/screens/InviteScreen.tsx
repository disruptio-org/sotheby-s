import { PASSWORD_MIN_LENGTH } from '@sothebys/domain';
import { useStore } from '../state/store';
import type { InviteField } from '../state/types';

const FIELDS: { key: InviteField; label: string; autoComplete: string }[] = [
  { key: 'password', label: 'Palavra-passe', autoComplete: 'new-password' },
  { key: 'confirm', label: 'Confirmar palavra-passe', autoComplete: 'new-password' },
];

/**
 * The one screen reached without a session. It shows only the name and the role
 * on the invitation — never the e-mail address, so a link that reaches the wrong
 * person discloses nothing about the account it belongs to.
 */
export function InviteScreen() {
  const { state, dispatch, actions } = useStore();
  const invite = state.invite;
  if (!invite) return null;

  const { stage, busy } = invite;
  const ready = stage === 'ready';
  const complete = invite.password.length > 0 && invite.confirm.length > 0;

  return (
    <div className="login">
      <div className="login__brand">
        <div className="login__eyebrow">Portugal · Plataforma Interna</div>
        <div>
          <p className="login__wordmark">Sotheby&rsquo;s</p>
          <hr className="login__rule" />
          <div className="login__line">International Realty · AI Back Office</div>
          <p className="login__blurb">
            Defina a sua palavra-passe para concluir o acesso. Só o utilizador a conhece — nem os
            administradores da plataforma a podem ver.
          </p>
        </div>
        <div className="login__legal">
          © 2026 · Uso interno · Sotheby&rsquo;s International Realty® é uma marca registada da
          Sotheby&rsquo;s International Realty Affiliates LLC.
        </div>
      </div>

      <div className="login__panel">
        {stage === 'checking' && (
          <div className="login__form" role="status" aria-live="polite">
            <div className="login__kicker">Convite</div>
            <h1 className="login__title">A verificar a ligação…</h1>
          </div>
        )}

        {stage === 'refused' && (
          <div className="login__form">
            <div className="login__kicker">Convite</div>
            <h1 className="login__title">Ligação já não é válida</h1>
            <p className="login__error" role="alert">
              {invite.refusal}
            </p>
            <p className="login__note">
              Peça um novo convite a quem administra a plataforma. Cada ligação serve uma única vez.
            </p>
            <button
              type="button"
              className="btn btn--primary login__submit"
              onClick={() => dispatch({ type: 'invite/dismiss' })}
            >
              Ir para o início de sessão
            </button>
          </div>
        )}

        {ready && (
          <form
            className="login__form"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.redeemInvitation();
            }}
          >
            <div className="login__kicker">Convite</div>
            <h1 className="login__title">Bem-vindo, {invite.name}</h1>
            <p className="login__note invite__role">
              Perfil atribuído: <strong>{invite.roleName}</strong>
            </p>

            {FIELDS.map((field) => (
              <div className="login__field" key={field.key}>
                <label className="field__label" htmlFor={`invite-${field.key}`}>
                  {field.label}
                </label>
                <input
                  id={`invite-${field.key}`}
                  className="input--underline"
                  type="password"
                  autoComplete={field.autoComplete}
                  placeholder="••••••••••••"
                  value={invite[field.key]}
                  disabled={busy}
                  aria-describedby={field.key === 'password' ? 'invite-rule' : undefined}
                  onChange={(event) =>
                    dispatch({
                      type: 'invite/setField',
                      field: field.key,
                      value: event.target.value,
                    })
                  }
                />
              </div>
            ))}

            <p className="login__note" id="invite-rule">
              Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
            </p>

            {invite.error && (
              <p className="login__error" role="alert">
                {invite.error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--primary login__submit"
              disabled={busy || !complete}
            >
              {busy ? 'A definir…' : 'Definir palavra-passe e entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
