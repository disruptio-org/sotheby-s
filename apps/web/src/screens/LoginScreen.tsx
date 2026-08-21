import { useStore } from '../state/store';

export function LoginScreen() {
  const { state, dispatch, actions } = useStore();
  const { loginEmail, loginPassword, loginError, loginBusy } = state;

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
            void actions.signIn();
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
              value={loginEmail}
              disabled={loginBusy}
              onChange={(event) => dispatch({ type: 'login/setEmail', value: event.target.value })}
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
              value={loginPassword}
              disabled={loginBusy}
              onChange={(event) =>
                dispatch({ type: 'login/setPassword', value: event.target.value })
              }
            />
          </div>

          {loginError && (
            <p className="login__error" role="alert">
              {loginError}
            </p>
          )}

          <button type="submit" className="btn btn--primary login__submit" disabled={loginBusy}>
            {loginBusy ? 'A entrar…' : 'Entrar'}
          </button>

          <div className="login__links">
            <span className="login__note">
              Sem acesso? Peça a um administrador para o convidar.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
