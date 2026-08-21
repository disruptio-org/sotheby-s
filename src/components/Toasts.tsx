import { useEffect } from 'react';
import { TOAST_DURATION } from '../config';
import { useStore } from '../state/store';
import type { Toast } from '../state/types';

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return <div className="toast">{toast.message}</div>;
}

export function Toasts() {
  const { state, dispatch } = useStore();

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {state.toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={(id) => dispatch({ type: 'toast/dismiss', id })}
        />
      ))}
    </div>
  );
}
