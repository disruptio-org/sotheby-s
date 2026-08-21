import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';

/**
 * The one and only time a generated password is visible. The server stores a
 * hash, so if this dialog is dismissed without copying, the only recourse is
 * to generate another.
 */
export function PasswordDialog() {
  const { state, dispatch } = useStore();
  const revealed = state.revealedPassword;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    setCopied(false);
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'password/hide' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, dispatch]);

  if (!revealed) return null;

  const copy = () => {
    void navigator.clipboard?.writeText(revealed.password).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="password-title">
      <div className="modal">
        <h2 className="modal__title" id="password-title">
          Palavra-passe temporária
        </h2>
        <p className="modal__text">
          Entregue esta palavra-passe a {revealed.userName}. Não voltará a ser mostrada — se a
          perder, terá de gerar outra.
        </p>
        <code className="password-reveal">{revealed.password}</code>
        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={copy}>
            {copied ? 'Copiada' : 'Copiar'}
          </button>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--ghost"
            onClick={() => dispatch({ type: 'password/hide' })}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
