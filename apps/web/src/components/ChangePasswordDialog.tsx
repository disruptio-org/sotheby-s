import { PASSWORD_MIN_LENGTH } from '@sothebys/domain';
import { useEffect, useRef, type FormEvent } from 'react';
import { useStore } from '../state/store';
import type { PasswordField } from '../state/types';

interface FieldSpec {
  name: PasswordField;
  label: string;
  autoComplete: 'current-password' | 'new-password';
}

const FIELDS: FieldSpec[] = [
  { name: 'current', label: 'Palavra-passe atual', autoComplete: 'current-password' },
  { name: 'next', label: 'Nova palavra-passe', autoComplete: 'new-password' },
  { name: 'confirm', label: 'Confirmar a nova palavra-passe', autoComplete: 'new-password' },
];

/**
 * Anyone with an account can change their own password here — no permission
 * gates it. Distinct from `PasswordDialog`, which reveals a credential an
 * administrator generated for somebody else.
 */
export function ChangePasswordDialog() {
  const { state, dispatch, actions } = useStore();
  const form = state.passwordChange;
  const open = form !== null;

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'passwordChange/close' });
        return;
      }
      if (event.key !== 'Tab') return;

      // Keep Tab inside the dialog: it is the only thing on screen that matters
      // while it is open, and a password field is a poor place to lose focus.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled])',
      );
      if (!focusable) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      const inside = active instanceof Node && dialogRef.current?.contains(active);

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dispatch]);

  if (!form) return null;

  const filled = form.current !== '' && form.next !== '' && form.confirm !== '';
  const tooShort = form.next !== '' && form.next.length < PASSWORD_MIN_LENGTH;
  const mismatch = form.confirm !== '' && form.next !== form.confirm;
  const canSubmit = filled && !tooShort && !mismatch && !form.busy;

  // Whichever of these is true, only one line is shown, so the reason a
  // disabled button is disabled is never ambiguous.
  const inlineProblem = mismatch
    ? 'As duas entradas não coincidem.'
    : tooShort
      ? `A nova palavra-passe tem de ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
      : '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    void actions.changePassword();
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <div className="modal" ref={dialogRef}>
        <h2 className="modal__title" id="change-password-title">
          Alterar palavra-passe
        </h2>
        <p className="modal__text">
          A alteração termina todas as outras sessões desta conta. Esta continua aberta.
        </p>

        <form onSubmit={submit} noValidate>
          {FIELDS.map((field, index) => (
            <div className="field" key={field.name}>
              <label className="field__label" htmlFor={`password-${field.name}`}>
                {field.label}
              </label>
              <input
                ref={index === 0 ? firstRef : undefined}
                id={`password-${field.name}`}
                className="input"
                type="password"
                autoComplete={field.autoComplete}
                value={form[field.name]}
                disabled={form.busy}
                aria-describedby={field.name === 'next' ? 'password-rule' : undefined}
                onChange={(event) =>
                  dispatch({
                    type: 'passwordChange/setField',
                    field: field.name,
                    value: event.target.value,
                  })
                }
              />
              {field.name === 'next' && (
                <p className="field__hint" id="password-rule">
                  Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
                </p>
              )}
            </div>
          ))}

          <p className="modal__problem" role="alert">
            {form.error || inlineProblem}
          </p>

          <div className="modal__actions">
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              {form.busy ? 'A alterar…' : 'Alterar palavra-passe'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={form.busy}
              onClick={() => dispatch({ type: 'passwordChange/close' })}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
