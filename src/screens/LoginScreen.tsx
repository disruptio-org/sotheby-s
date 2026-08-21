import type { KeyboardEvent } from 'react';
import { useStore } from '../state/store';

export function LoginScreen() {
  const { state, dispatch } = useStore();

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') dispatch({ type: 'login/submit' });
  };

  return (
    <div className="login">
      <div className="login__brand">
        <div className="login__eyebrow">Portugal · Plataforma Interna</div>
        <div>
          <p className="login__wordmark">Sotheby&rsquo;s</p>
          <hr className="login__rule" />
          <div className="login__line">International Realty · AI Back Office</div>
          <p className="login__blurb">
            Os agentes, skills e workflows por detrás da experiência do cliente — criados,
            sequenciados e geridos num só lugar.
          </p>
        </div>
        <div className="login__legal">
          © 2026 · Uso interno · Sotheby&rsquo;s International Realty® é uma marca registada da
          Sotheby&rsquo;s International Realty Affiliates LLC.
        </div>
      </div>

      <div className="login__panel">
        <form
          className="login__form"
          onSubmit={(event) => {
            event.preventDefault();
            dispatch({ type: 'login/submit' });
          }}
        >
          <div className="login__kicker">Iniciar sessão</div>
          <h1 className="login__title">Bem-vindo de volta</h1>

          <div className="login__field">
            <label className="field__label" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              className="input--underline"
              type="email"
              autoComplete="username"
              placeholder="nome@sothebysrealty.pt"
              value={state.loginEmail}
              onChange={(event) => dispatch({ type: 'login/setEmail', value: event.target.value })}
              onKeyDown={submitOnEnter}
            />
          </div>

          <div className="login__field">
            <label className="field__label" htmlFor="login-password">
              Palavra-passe
            </label>
            <input
              id="login-password"
              className="input--underline"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={state.loginPassword}
              onChange={(event) =>
                dispatch({ type: 'login/setPassword', value: event.target.value })
              }
              onKeyDown={submitOnEnter}
            />
          </div>

          <button type="submit" className="btn btn--primary login__submit">
            Entrar
          </button>

          <div className="login__links">
            <a href="#recuperar">Esqueceu a palavra-passe?</a>
            <span className="login__note">Acesso reservado a colaboradores</span>
          </div>
        </form>
      </div>
    </div>
  );
}
