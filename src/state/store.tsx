import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { APP_CONFIG, RUN_SETTLE_DELAY } from '../config';
import type { PermissionKey, Role, User } from '../domain/types';
import { createInitialState, reducer, selectors } from './reducer';
import type { AppAction, AppState } from './types';

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** The signed-in user, or undefined on the login screen / after deletion. */
  me: User | undefined;
  myRole: Role | undefined;
  /** Does the signed-in user's role grant this permission? */
  can: (permission: PermissionKey) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, APP_CONFIG.startLoggedIn, createInitialState);

  const { run } = state;

  // Drives a workflow run forward: one step per tick, then a short settle
  // before the completion toast clears the indicator.
  useEffect(() => {
    if (!run) return;

    if (run.done) {
      const timer = setTimeout(() => dispatch({ type: 'run/clear' }), RUN_SETTLE_DELAY);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      dispatch(run.index + 1 < run.total ? { type: 'run/advance' } : { type: 'run/finish' });
    }, APP_CONFIG.workflowStepDelay);
    return () => clearTimeout(timer);
  }, [run]);

  const value = useMemo<StoreValue>(() => {
    const me = selectors.currentUser(state);
    const myRole = selectors.roleOf(state, me);
    return {
      state,
      dispatch,
      me,
      myRole,
      can: (permission) => !!myRole?.perms[permission],
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
