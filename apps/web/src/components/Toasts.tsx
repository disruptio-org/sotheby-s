import { useStore } from '../state/store';

export function Toasts() {
  const { state, dispatch } = useStore();

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {state.toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}
          title="Dispensar"
          onClick={() => dispatch({ type: 'toast/dismiss', id: toast.id })}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
