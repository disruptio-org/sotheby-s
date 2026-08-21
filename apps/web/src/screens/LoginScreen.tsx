import { useStore } from '../state/store';

export function LoginScreen() {
  const { state, dispatch, actions } = useStore();
  const { loginEmail, loginPassword, loginError, loginBusy, forgot } = state;

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
        {forgot ? (
          <form
            className="login__form"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.requestPasswordReset();
            }}
          >
            <div className="login__kicker">Recuperar acesso</div>
            <h1 className="login__title">Esqueceu-se da palavra-passe?</h1>

            {forgot.sent ? (
              <>
                {/* The same words for every address. Whether an account exists
                    is not something this screen is willing to tell anybody. */}
                <p className="login__note" role="status">
                  Se existir uma conta associada a esse endereço, enviámos instruções para
                  redefinir a palavra-passe. A ligação é válida durante 60 minutos.
                </p>
                <button
                  type="button"
                  className="btn btn--primary login__submit"
                  onClick={() => dispatch({ type: 'forgot/close' })}
                >
                  Voltar ao início de sessão
                </button>
              </>
            ) : (
              <>
                <div className="login__field">
                  <label className="field__label" htmlFor="forgot-email">
                    E-mail
                  </label>
                  <input
                    id="forgot-email"
                    className="input--underline"
                    type="email"
                    autoComplete="username"
                    placeholder="nome@sothebysrealty.pt"
                    value={forgot.email}
                    disabled={forgot.busy}
                    onChange={(event) =>
                      dispatch({ type: 'forgot/setEmail', value: event.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn--primary login__submit"
                  disabled={forgot.busy || !forgot.email.trim()}
                >
                  {forgot.busy ? 'A enviar…' : 'Enviar instruções'}
                </button>

                <div className="login__links">
                  <button
                    type="button"
                    className="link-action link-action--quiet"
                    onClick={() => dispatch({ type: 'forgot/close' })}
                  >
                    Voltar ao início de sessão
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
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
              <button
                type="button"
                className="link-action link-action--quiet"
                onClick={() => dispatch({ type: 'forgot/open' })}
              >
                Esqueci-me da palavra-passe
              </button>
              <span className="login__note">
                Sem acesso? Peça a um administrador para o convidar.
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
