import { PASSWORD_MIN_LENGTH, type ClaimKind } from '@sothebys/domain';
import { useStore } from '../state/store';
import type { ClaimField } from '../state/types';

const FIELDS: { key: ClaimField; label: string }[] = [
  { key: 'password', label: 'Palavra-passe' },
  { key: 'confirm', label: 'Confirmar palavra-passe' },
];

/** The same page serves both links; only the words around the form change. */
const COPY: Record<ClaimKind, { kicker: string; blurb: string; title: (name: string) => string }> =
  {
    invite: {
      kicker: 'Convite',
      blurb:
        'Defina a sua palavra-passe para concluir o acesso. Só o utilizador a conhece — nem os administradores da plataforma a podem ver.',
      title: (name) => `Bem-vindo, ${name}`,
    },
    reset: {
      kicker: 'Recuperar acesso',
      blurb:
        'Defina uma nova palavra-passe. Ao concluir, todas as sessões abertas nesta conta terminam.',
      title: (name) => `Olá, ${name}`,
    },
  };

/**
 * The one screen reached without a session. It shows only the name on the link,
 * never the e-mail address, so a link that reaches the wrong person discloses
 * nothing about the account it belongs to.
 */
export function ClaimScreen() {
  const { state, dispatch, actions } = useStore();
  const claim = state.claim;
  if (!claim) return null;

  const copy = COPY[claim.kind];
  const { stage, busy } = claim;
  const complete = claim.password.length > 0 && claim.confirm.length > 0;

  return (
    <div className="login">
      <div className="login__brand">
        <div className="login__eyebrow">Portugal · Plataforma Interna</div>
        <div>
          <p className="login__wordmark">Sotheby&rsquo;s</p>
          <hr className="login__rule" />
          <div className="login__line">International Realty · AI Back Office</div>
          <p className="login__blurb">{copy.blurb}</p>
        </div>
        <div className="login__legal">
          © 2026 · Uso interno · Sotheby&rsquo;s International Realty® é uma marca registada da
          Sotheby&rsquo;s International Realty Affiliates LLC.
        </div>
      </div>

      <div className="login__panel">
        {stage === 'checking' && (
          <div className="login__form" role="status" aria-live="polite">
            <div className="login__kicker">{copy.kicker}</div>
            <h1 className="login__title">A verificar a ligação…</h1>
          </div>
        )}

        {stage === 'refused' && (
          <div className="login__form">
            <div className="login__kicker">{copy.kicker}</div>
            <h1 className="login__title">Ligação já não é válida</h1>
            <p className="login__error" role="alert">
              {claim.refusal}
            </p>
            <p className="login__note">
              {claim.kind === 'invite'
                ? 'Peça um novo convite a quem administra a plataforma. Cada ligação serve uma única vez.'
                : 'Peça uma nova ligação no início de sessão. Cada ligação serve uma única vez.'}
            </p>
            <button
              type="button"
              className="btn btn--primary login__submit"
              onClick={() => dispatch({ type: 'claim/dismiss' })}
            >
              Ir para o início de sessão
            </button>
          </div>
        )}

        {stage === 'ready' && (
          <form
            className="login__form"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.redeemClaim();
            }}
          >
            <div className="login__kicker">{copy.kicker}</div>
            <h1 className="login__title">{copy.title(claim.name)}</h1>
            {claim.roleName && (
              <p className="login__note claim__role">
                Perfil atribuído: <strong>{claim.roleName}</strong>
              </p>
            )}

            {FIELDS.map((field) => (
              <div className="login__field" key={field.key}>
                <label className="field__label" htmlFor={`claim-${field.key}`}>
                  {field.label}
                </label>
                <input
                  id={`claim-${field.key}`}
                  className="input--underline"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={claim[field.key]}
                  disabled={busy}
                  aria-describedby={field.key === 'password' ? 'claim-rule' : undefined}
                  onChange={(event) =>
                    dispatch({
                      type: 'claim/setField',
                      field: field.key,
                      value: event.target.value,
                    })
                  }
                />
              </div>
            ))}

            <p className="login__note" id="claim-rule">
              Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
            </p>

            {claim.error && (
              <p className="login__error" role="alert">
                {claim.error}
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
