/// <reference types="vite/client" />

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const numberFromEnv = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  return raw !== undefined && Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The two knobs the design exposed as canvas props, promoted to build-time
 * configuration. Override in a `.env` file (see `.env.example`).
 */
export const APP_CONFIG = {
  /** Skip the sign-in screen and boot straight into the back office. */
  startLoggedIn: import.meta.env.VITE_START_LOGGED_IN === 'true',
  /** How long each workflow step stays in the "A executar" state, in ms. */
  workflowStepDelay: clamp(numberFromEnv(import.meta.env.VITE_WORKFLOW_STEP_DELAY, 1000), 300, 2500),
} as const;

/** How long a toast stays on screen, in ms. */
export const TOAST_DURATION = 3400;

/** Pause on the fully-completed workflow before clearing the run indicator, in ms. */
export const RUN_SETTLE_DELAY = 900;
