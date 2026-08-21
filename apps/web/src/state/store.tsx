import type { PermissionKey, RunEvent } from '@sothebys/domain';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { endpoints } from '../api/endpoints';
import { TOAST_DURATION } from '../config';
import { makeActions, type Actions } from './effects';
import { messages } from './messages';
import { createInitialState, reducer } from './reducer';
import type { AppAction, AppState } from './types';

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: Actions;
  can: (key: PermissionKey) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // Effects read the latest state without being re-created on every change.
  const read = useRef(state);
  read.current = state;

  const actions = useMemo(() => makeActions(dispatch, read), [dispatch]);

  const granted = useMemo(
    () => new Set<PermissionKey>(state.session?.permissions ?? []),
    [state.session],
  );
  const can = useMemo(() => (key: PermissionKey) => granted.has(key), [granted]);

  // Resume an existing session, if the cookie is still good.
  useEffect(() => {
    void actions.bootstrap();
  }, [actions]);

  // Toasts retire themselves.
  useEffect(() => {
    const first = state.toasts[0];
    if (!first) return;
    const timer = setTimeout(() => dispatch({ type: 'toast/dismiss', id: first.id }), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [state.toasts]);

  // Live progress for the run on screen. The server closes the stream once the
  // run reaches a terminal state.
  const runId = state.activeRun?.id ?? null;
  const runStatus = state.activeRun?.status ?? null;
  useEffect(() => {
    if (runId === null) return;
    if (runStatus !== 'QUEUED' && runStatus !== 'RUNNING') return;

    const source = endpoints.runs.events(runId);

    source.onmessage = (message: MessageEvent<string>) => {
      let event: RunEvent;
      try {
        event = JSON.parse(message.data) as RunEvent;
      } catch {
        return;
      }

      dispatch({ type: 'run/event', event });

      if (event.type === 'run.finished') {
        source.close();
        const run = event.run;
        if (run.status === 'SUCCEEDED') {
          dispatch({
            type: 'toast/push',
            message: messages.runFinished(run.workflowName, run.steps.length),
          });
        } else if (run.status === 'FAILED') {
          dispatch({
            type: 'toast/push',
            message: messages.runFailed(run.workflowName, run.error ?? 'erro desconhecido'),
            tone: 'error',
          });
        } else {
          dispatch({ type: 'toast/push', message: messages.runCanceled });
        }
        void actions.runFinished();
      }
    };

    source.onerror = () => {
      // The browser retries on its own; a closed stream after completion is
      // expected and needs no handling here.
    };

    return () => source.close();
  }, [runId, runStatus, actions]);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, actions, can }),
    [state, actions, can],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = (): StoreValue => {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
};
