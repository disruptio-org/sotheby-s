import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

export function ConfirmDialog() {
  const { state, dispatch, actions } = useStore();
  const confirm = state.confirm;
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirm) return;
    acceptRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'confirm/cancel' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, dispatch]);

  if (!confirm) return null;

  const isReset = confirm.intent.kind === 'resetPassword';

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal">
        <h2 className="modal__title" id="confirm-title">
          Confirme, por favor
        </h2>
        <p className="modal__text">{confirm.text}</p>
        <div className="modal__actions">
          <button
            ref={acceptRef}
            type="button"
            className={`btn ${isReset ? 'btn--primary' : 'btn--danger'}`}
            disabled={confirm.busy}
            onClick={() => void actions.acceptConfirm()}
          >
            {confirm.busy ? 'A processar…' : isReset ? 'Gerar palavra-passe' : 'Eliminar'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={confirm.busy}
            onClick={() => dispatch({ type: 'confirm/cancel' })}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
