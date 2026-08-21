import {
  firstVisibleSection,
  type PermissionKey,
  type SectionId,
  type SessionDto,
} from '@sothebys/domain';
import type {
  AppAction,
  AppState,
  DrawerFields,
  DrawerKind,
  DrawerState,
  Toast,
} from './types';

const DEFAULT_SECTION: SectionId = 'agents';

export const emptyFields = (): DrawerFields => ({
  name: '',
  email: '',
  roleId: '',
  model: '',
  temp: '0.7',
  desc: '',
  prompt: '',
  instr: '',
  cat: '',
  agentId: '',
  limitRuns: '',
  limitBudget: '',
  skillIds: [],
  knowIds: [],
  toolIds: [],
});

export const createInitialState = (): AppState => ({
  status: 'booting',
  session: null,

  loginEmail: '',
  loginPassword: '',
  loginError: '',
  loginBusy: false,

  section: DEFAULT_SECTION,
  navOpen: true,

  loading: false,
  agents: [],
  skills: [],
  workflows: [],
  users: [],
  roles: [],
  settings: null,
  catalog: null,
  runs: [],

  selectedWorkflowId: 0,
  selectedRoleId: 0,

  activeRun: null,
  runBusy: false,
  runInput: '',

  settingsDraft: { budget: '', alertPct: '', key: '' },
  settingsBusy: false,

  drawer: null,
  confirm: null,
  toasts: [],
  nextToastId: 1,

  revealedPassword: null,
  passwordChange: null,
});

const withToast = (state: AppState, message: string, tone: Toast['tone'] = 'info'): AppState => {
  const toast: Toast = { id: state.nextToastId, message, tone };
  return { ...state, toasts: [...state.toasts, toast], nextToastId: state.nextToastId + 1 };
};

/** First section the signed-in role may view — the post-login landing page. */
const landingSection = (session: SessionDto): SectionId => {
  const granted = new Set<PermissionKey>(session.permissions);
  return firstVisibleSection((key) => granted.has(key));
};

const openDrawer = (state: AppState, kind: DrawerKind, id: number | null): DrawerState => {
  const fields = emptyFields();
  const base = { kind, id, error: '', busy: false };

  if (kind === 'agent') {
    const agent = id === null ? undefined : state.agents.find((a) => a.id === id);
    return {
      ...base,
      fields: agent
        ? {
            ...fields,
            name: agent.name,
            model: agent.model,
            temp: String(agent.temp),
            desc: agent.desc,
            prompt: agent.prompt,
            skillIds: [...agent.skillIds],
            knowIds: [...agent.knowIds],
            toolIds: [...agent.toolIds],
            limitRuns: String(agent.limitRuns),
            limitBudget: String(Math.round(agent.limitBudgetCents / 100)),
          }
        : {
            ...fields,
            model: state.settings?.model ?? state.catalog?.models[0]?.id ?? '',
            limitRuns: '100',
            limitBudget: '100',
          },
    };
  }

  if (kind === 'skill') {
    const skill = id === null ? undefined : state.skills.find((s) => s.id === id);
    return {
      ...base,
      fields: skill
        ? { ...fields, name: skill.name, cat: skill.cat, desc: skill.desc, instr: skill.instr }
        : { ...fields, cat: 'CONTENT' },
    };
  }

  if (kind === 'user') {
    // Invitations default to the least privileged role on the list.
    const fallback = state.roles.filter((role) => !role.system).at(-1) ?? state.roles.at(-1);
    return {
      ...base,
      id: null,
      fields: { ...fields, roleId: fallback ? String(fallback.id) : '' },
    };
  }

  if (kind === 'workflow') {
    const first = state.agents.find((agent) => agent.status === 'ACTIVE') ?? state.agents[0];
    return { ...base, id: null, fields: { ...fields, agentId: first ? String(first.id) : '' } };
  }

  const role = id === null ? undefined : state.roles.find((r) => r.id === id);
  return {
    ...base,
    kind: 'role',
    fields: role ? { ...fields, name: role.name, desc: role.desc } : fields,
  };
};

/** Applies a live run event onto the run currently on screen. */
const applyRunEvent = (state: AppState, action: Extract<AppAction, { type: 'run/event' }>) => {
  const event = action.event;
  const current = state.activeRun;

  // A stream closing after the user has moved on can deliver one last frame;
  // ignore anything that is not about the run currently on screen.
  const runId = event.type === 'run.snapshot' ? event.run.id : event.runId;
  if (current && current.id !== runId) return state;

  if (event.type === 'run.snapshot') return { ...state, activeRun: event.run };
  if (!current) return state;

  switch (event.type) {
    case 'run.started':
      return { ...state, activeRun: { ...current, status: 'RUNNING' as const, startedAt: event.startedAt } };

    case 'step.started':
      return {
        ...state,
        activeRun: {
          ...current,
          steps: current.steps.map((step) =>
            step.index === event.index
              ? { ...step, status: 'RUNNING' as const, startedAt: event.startedAt }
              : step,
          ),
        },
      };

    case 'step.finished':
      return {
        ...state,
        activeRun: {
          ...current,
          steps: current.steps.map((step) => (step.index === event.index ? event.step : step)),
        },
      };

    case 'run.finished':
      return { ...state, activeRun: event.run };
  }
};

export const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'boot/anonymous':
      return { ...state, status: 'anonymous', session: null };

    case 'boot/ready':
      return {
        ...state,
        status: 'ready',
        session: action.session,
        section: landingSection(action.session),
        loginEmail: '',
        loginPassword: '',
        loginError: '',
        loginBusy: false,
      };

    case 'session/signedOut':
      return {
        ...createInitialState(),
        status: 'anonymous',
        navOpen: state.navOpen,
      };

    case 'login/setEmail':
      return { ...state, loginEmail: action.value, loginError: '' };

    case 'login/setPassword':
      return { ...state, loginPassword: action.value, loginError: '' };

    case 'login/busy':
      return { ...state, loginBusy: action.value };

    case 'login/error':
      return { ...state, loginError: action.message, loginBusy: false };

    case 'data/loading':
      return { ...state, loading: action.value };

    case 'data/set': {
      const next: AppState = { ...state, ...action.patch };

      // Keep the two list selections pointing at something that still exists.
      if (action.patch.workflows) {
        const stillThere = next.workflows.some((w) => w.id === next.selectedWorkflowId);
        next.selectedWorkflowId = stillThere
          ? next.selectedWorkflowId
          : (next.workflows[0]?.id ?? 0);
      }
      if (action.patch.roles) {
        const stillThere = next.roles.some((r) => r.id === next.selectedRoleId);
        next.selectedRoleId = stillThere ? next.selectedRoleId : (next.roles[0]?.id ?? 0);
      }
      if (action.patch.settings) {
        next.settingsDraft = {
          budget: String(Math.round(action.patch.settings.budgetCents / 100)),
          alertPct: String(action.patch.settings.alertPct),
          key: '',
        };
      }
      return next;
    }

    case 'nav/goTo':
      return { ...state, section: action.section };

    case 'nav/toggle':
      return { ...state, navOpen: !state.navOpen };

    case 'toast/push':
      return withToast(state, action.message, action.tone ?? 'info');

    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    case 'drawer/open':
      return { ...state, drawer: openDrawer(state, action.kind, action.id ?? null) };

    case 'drawer/close':
      return { ...state, drawer: null };

    case 'drawer/setField':
      return state.drawer
        ? {
            ...state,
            drawer: {
              ...state.drawer,
              error: '',
              fields: { ...state.drawer.fields, [action.field]: action.value },
            },
          }
        : state;

    case 'drawer/toggleChip': {
      if (!state.drawer) return state;
      const current = state.drawer.fields[action.field];
      const next = current.includes(action.id)
        ? current.filter((id) => id !== action.id)
        : [...current, action.id];
      return {
        ...state,
        drawer: { ...state.drawer, fields: { ...state.drawer.fields, [action.field]: next } },
      };
    }

    case 'drawer/busy':
      return state.drawer ? { ...state, drawer: { ...state.drawer, busy: action.value } } : state;

    case 'drawer/error':
      return state.drawer
        ? { ...state, drawer: { ...state.drawer, error: action.message, busy: false } }
        : state;

    case 'confirm/request':
      return { ...state, confirm: { text: action.text, intent: action.intent, busy: false } };

    case 'confirm/busy':
      return state.confirm ? { ...state, confirm: { ...state.confirm, busy: action.value } } : state;

    case 'confirm/cancel':
      return { ...state, confirm: null };

    case 'workflow/select':
      return { ...state, selectedWorkflowId: action.id, activeRun: null, runInput: '' };

    case 'role/select':
      return { ...state, selectedRoleId: action.id };

    case 'run/setInput':
      return { ...state, runInput: action.value };

    case 'run/busy':
      return { ...state, runBusy: action.value };

    case 'run/watch':
      return { ...state, activeRun: action.run, runBusy: false };

    case 'run/event':
      return applyRunEvent(state, action);

    case 'run/clear':
      return { ...state, activeRun: null, runBusy: false };

    case 'settings/setDraft':
      return {
        ...state,
        settingsDraft: { ...state.settingsDraft, [action.field]: action.value },
      };

    case 'settings/busy':
      return { ...state, settingsBusy: action.value };

    case 'password/reveal':
      return {
        ...state,
        confirm: null,
        revealedPassword: { userName: action.userName, password: action.password },
      };

    case 'password/hide':
      return { ...state, revealedPassword: null };

    case 'passwordChange/open':
      return {
        ...state,
        passwordChange: { current: '', next: '', confirm: '', error: '', busy: false },
      };

    // Closing drops the whole object, so the typed passwords leave the store.
    case 'passwordChange/close':
      return { ...state, passwordChange: null };

    case 'passwordChange/setField':
      return state.passwordChange
        ? {
            ...state,
            passwordChange: { ...state.passwordChange, [action.field]: action.value, error: '' },
          }
        : state;

    case 'passwordChange/busy':
      return state.passwordChange
        ? { ...state, passwordChange: { ...state.passwordChange, busy: action.value } }
        : state;

    case 'passwordChange/error':
      return state.passwordChange
        ? {
            ...state,
            passwordChange: { ...state.passwordChange, error: action.message, busy: false },
          }
        : state;
  }
};

export const selectors = {
  selectedWorkflow: (state: AppState) =>
    state.workflows.find((w) => w.id === state.selectedWorkflowId) ?? state.workflows[0],
  selectedRole: (state: AppState) =>
    state.roles.find((r) => r.id === state.selectedRoleId) ?? state.roles[0],
  roleOf: (state: AppState, roleId: number) => state.roles.find((r) => r.id === roleId),
  agentOf: (state: AppState, agentId: number) => state.agents.find((a) => a.id === agentId),
  skillOf: (state: AppState, skillId: number) => state.skills.find((s) => s.id === skillId),
};
