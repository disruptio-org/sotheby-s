import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

export function ConfirmDialog() {
  const { state, dispatch } = useStore();
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
            className="btn btn--danger"
            onClick={() => dispatch({ type: 'confirm/accept' })}
          >
            Eliminar
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => dispatch({ type: 'confirm/cancel' })}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
