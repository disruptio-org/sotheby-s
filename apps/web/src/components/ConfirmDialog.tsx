import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import type { ConfirmIntent } from '../state/types';

/** What the accepting button says, and whether it is the destructive one. */
const ACTION: Record<ConfirmIntent['kind'], { label: string; danger: boolean }> = {
  deleteAgent: { label: 'Eliminar', danger: true },
  deleteSkill: { label: 'Eliminar', danger: true },
  deleteUser: { label: 'Eliminar', danger: true },
  deleteWorkflow: { label: 'Eliminar', danger: true },
  deleteRole: { label: 'Eliminar', danger: true },
  resetPassword: { label: 'Gerar palavra-passe', danger: false },
  resendInvitation: { label: 'Enviar convite', danger: false },
};

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

  const action = ACTION[confirm.intent.kind];

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
            className={`btn ${action.danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={confirm.busy}
            onClick={() => void actions.acceptConfirm()}
          >
            {confirm.busy ? 'A processar…' : action.label}
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
