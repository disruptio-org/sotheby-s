import { MODELS_BY_PROVIDER, PROVIDER_NAME, SKILL_CATEGORIES } from '../domain/catalogs';
import { firstVisibleSection } from '../domain/permissions';
import {
  FIRST_RUNTIME_ID,
  SEED_AGENTS,
  SEED_ROLES,
  SEED_SETTINGS,
  SEED_SKILLS,
  SEED_USERS,
  SEED_WORKFLOWS,
  TODAY_LABEL,
} from '../domain/seed';
import type { Role, SectionId, Skill, SkillCategory, User } from '../domain/types';
import { messages } from './messages';
import type {
  AppAction,
  AppState,
  DrawerFields,
  DrawerKind,
  DrawerState,
  Toast,
} from './types';

const DEFAULT_SECTION: SectionId = 'agents';

const emptyFields = (): DrawerFields => ({
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

export const createInitialState = (startLoggedIn: boolean): AppState => ({
  screen: startLoggedIn ? 'app' : 'login',
  section: DEFAULT_SECTION,
  navOpen: true,
  loginEmail: '',
  loginPassword: '',
  currentUserId: 1,
  roles: SEED_ROLES,
  users: SEED_USERS,
  skills: SEED_SKILLS,
  agents: SEED_AGENTS,
  workflows: SEED_WORKFLOWS,
  selectedWorkflowId: 1,
  selectedRoleId: 1,
  settings: SEED_SETTINGS,
  drawer: null,
  confirm: null,
  toasts: [],
  run: null,
  nextId: FIRST_RUNTIME_ID,
  nextToastId: 1,
});

const withToast = (state: AppState, message: string): AppState => {
  const toast: Toast = { id: state.nextToastId, message };
  return { ...state, toasts: [...state.toasts, toast], nextToastId: state.nextToastId + 1 };
};

const roleOf = (state: AppState, user: User | undefined): Role | undefined =>
  user ? state.roles.find((r) => r.id === user.roleId) : undefined;

const currentUser = (state: AppState): User | undefined =>
  state.users.find((u) => u.id === state.currentUserId);

/** First section the given role is allowed to see, used as a landing page. */
const landingSection = (role: Role | undefined): SectionId =>
  firstVisibleSection((key) => !!role?.perms[key]);

const selectedWorkflow = (state: AppState) =>
  state.workflows.find((w) => w.id === state.selectedWorkflowId) ?? state.workflows[0];

const selectedRole = (state: AppState) =>
  state.roles.find((r) => r.id === state.selectedRoleId) ?? state.roles[0];

const isSkillCategory = (value: string): value is SkillCategory =>
  (SKILL_CATEGORIES as string[]).includes(value);

const openDrawer = (state: AppState, kind: DrawerKind, id: number | null): DrawerState => {
  const fields = emptyFields();

  if (kind === 'agent') {
    const agent = id === null ? undefined : state.agents.find((a) => a.id === id);
    return {
      kind,
      id,
      error: '',
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
            limitBudget: String(agent.limitBudget),
          }
        : { ...fields, model: state.settings.model, limitRuns: '100', limitBudget: '100' },
    };
  }

  if (kind === 'skill') {
    const skill = id === null ? undefined : state.skills.find((s) => s.id === id);
    return {
      kind,
      id,
      error: '',
      fields: skill
        ? { ...fields, name: skill.name, cat: skill.cat, desc: skill.desc, instr: skill.instr }
        : { ...fields, cat: 'Conteúdo' },
    };
  }

  if (kind === 'user') {
    const fallbackRole = state.roles[state.roles.length - 1];
    return {
      kind,
      id: null,
      error: '',
      fields: { ...fields, roleId: fallbackRole ? String(fallbackRole.id) : '' },
    };
  }

  if (kind === 'workflow') {
    const firstAgent = state.agents[0];
    return {
      kind,
      id: null,
      error: '',
      fields: { ...fields, agentId: firstAgent ? String(firstAgent.id) : '' },
    };
  }

  const role = id === null ? undefined : state.roles.find((r) => r.id === id);
  return {
    kind: 'role',
    id,
    error: '',
    fields: role ? { ...fields, name: role.name, desc: role.desc } : fields,
  };
};

const drawerError = (state: AppState, error: string): AppState =>
  state.drawer ? { ...state, drawer: { ...state.drawer, error } } : state;

const saveDrawer = (state: AppState): AppState => {
  const drawer = state.drawer;
  if (!drawer) return state;

  const { fields } = drawer;
  const name = fields.name.trim();
  if (!name) return drawerError(state, messages.errors.nameRequired);

  switch (drawer.kind) {
    case 'user': {
      const email = fields.email.trim();
      if (!email || email.indexOf('@') < 1 || !email.includes('.')) {
        return drawerError(state, messages.errors.emailInvalid);
      }
      const user: User = {
        id: state.nextId,
        name,
        email,
        roleId: Number(fields.roleId),
        status: 'Convidado',
        last: '—',
      };
      return withToast(
        {
          ...state,
          users: [...state.users, user],
          nextId: state.nextId + 1,
          drawer: null,
        },
        messages.inviteSent(email),
      );
    }

    case 'agent': {
      const record = {
        name,
        model: fields.model,
        temp: Number(fields.temp),
        desc: fields.desc.trim(),
        prompt: fields.prompt,
        skillIds: fields.skillIds,
        knowIds: fields.knowIds,
        toolIds: fields.toolIds,
        limitRuns: Number(fields.limitRuns) || 0,
        limitBudget: Number(fields.limitBudget) || 0,
      };
      if (drawer.id !== null) {
        return withToast(
          {
            ...state,
            agents: state.agents.map((a) => (a.id === drawer.id ? { ...a, ...record } : a)),
            drawer: null,
          },
          messages.agentUpdated,
        );
      }
      return withToast(
        {
          ...state,
          agents: [...state.agents, { id: state.nextId, status: 'Ativo', runs: 0, ...record }],
          nextId: state.nextId + 1,
          drawer: null,
        },
        messages.agentCreated(name),
      );
    }

    case 'skill': {
      const record = {
        name,
        cat: isSkillCategory(fields.cat) ? fields.cat : 'Conteúdo',
        desc: fields.desc.trim(),
        instr: fields.instr,
        updated: TODAY_LABEL,
      } satisfies Omit<Skill, 'id'>;
      if (drawer.id !== null) {
        return withToast(
          {
            ...state,
            skills: state.skills.map((s) => (s.id === drawer.id ? { ...s, ...record } : s)),
            drawer: null,
          },
          messages.skillUpdated,
        );
      }
      return withToast(
        {
          ...state,
          skills: [...state.skills, { id: state.nextId, ...record }],
          nextId: state.nextId + 1,
          drawer: null,
        },
        messages.skillCreated(name),
      );
    }

    case 'workflow':
      return withToast(
        {
          ...state,
          workflows: [
            ...state.workflows,
            { id: state.nextId, name, agentId: Number(fields.agentId), steps: [] },
          ],
          selectedWorkflowId: state.nextId,
          nextId: state.nextId + 1,
          drawer: null,
        },
        messages.workflowCreated,
      );

    case 'role': {
      if (drawer.id !== null) {
        return withToast(
          {
            ...state,
            roles: state.roles.map((r) =>
              r.id === drawer.id ? { ...r, name, desc: fields.desc.trim() } : r,
            ),
            drawer: null,
          },
          messages.roleUpdated,
        );
      }
      return withToast(
        {
          ...state,
          roles: [
            ...state.roles,
            { id: state.nextId, name, desc: fields.desc.trim(), system: false, perms: {} },
          ],
          selectedRoleId: state.nextId,
          nextId: state.nextId + 1,
          drawer: null,
          section: 'roles',
        },
        messages.roleCreated,
      );
    }
  }
};

const acceptConfirm = (state: AppState): AppState => {
  const confirm = state.confirm;
  if (!confirm) return state;
  const cleared: AppState = { ...state, confirm: null };
  const { intent } = confirm;

  switch (intent.kind) {
    case 'deleteAgent':
      return withToast(
        { ...cleared, agents: cleared.agents.filter((a) => a.id !== intent.id) },
        messages.agentDeleted,
      );

    case 'deleteSkill':
      return withToast(
        {
          ...cleared,
          skills: cleared.skills.filter((s) => s.id !== intent.id),
          agents: cleared.agents.map((a) => ({
            ...a,
            skillIds: a.skillIds.filter((id) => id !== intent.id),
          })),
          workflows: cleared.workflows.map((w) => ({
            ...w,
            steps: w.steps.filter((id) => id !== intent.id),
          })),
        },
        messages.skillDeleted,
      );

    case 'deleteUser':
      return withToast(
        { ...cleared, users: cleared.users.filter((u) => u.id !== intent.id) },
        messages.userDeleted,
      );

    case 'deleteWorkflow': {
      const remaining = cleared.workflows.filter((w) => w.id !== intent.id);
      const first = remaining[0];
      return withToast(
        { ...cleared, workflows: remaining, selectedWorkflowId: first ? first.id : 0 },
        messages.workflowDeleted,
      );
    }

    case 'deleteRole': {
      const remaining = cleared.roles.filter((r) => r.id !== intent.id);
      const first = remaining[0];
      return withToast(
        { ...cleared, roles: remaining, selectedRoleId: first ? first.id : 0 },
        messages.roleDeleted,
      );
    }
  }
};

export const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'login/setEmail':
      return { ...state, loginEmail: action.value };

    case 'login/setPassword':
      return { ...state, loginPassword: action.value };

    case 'login/submit': {
      const email = state.loginEmail.trim().toLowerCase();
      const matched = state.users.find(
        (u) => u.email.toLowerCase() === email && u.status === 'Ativo',
      );
      const user = matched ?? state.users[0];
      if (!user) return state;
      return {
        ...state,
        screen: 'app',
        currentUserId: user.id,
        section: landingSection(roleOf(state, user)),
        loginEmail: '',
        loginPassword: '',
        run: null,
      };
    }

    case 'session/signOut':
      return { ...state, screen: 'login', run: null, drawer: null, confirm: null };

    case 'nav/goTo':
      return { ...state, section: action.section };

    case 'nav/toggle':
      return { ...state, navOpen: !state.navOpen };

    case 'toast/push':
      return withToast(state, action.message);

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

    case 'drawer/save':
      return saveDrawer(state);

    case 'agents/requestDelete': {
      const agent = state.agents.find((a) => a.id === action.id);
      if (!agent) return state;
      return {
        ...state,
        confirm: {
          text: messages.confirmDeleteAgent(agent.name),
          intent: { kind: 'deleteAgent', id: agent.id },
        },
      };
    }

    case 'skills/requestDelete': {
      const skill = state.skills.find((s) => s.id === action.id);
      if (!skill) return state;
      return {
        ...state,
        confirm: {
          text: messages.confirmDeleteSkill(skill.name),
          intent: { kind: 'deleteSkill', id: skill.id },
        },
      };
    }

    case 'users/requestDelete': {
      const user = state.users.find((u) => u.id === action.id);
      if (!user) return state;
      return {
        ...state,
        confirm: {
          text: messages.confirmDeleteUser(user.name),
          intent: { kind: 'deleteUser', id: user.id },
        },
      };
    }

    case 'workflow/requestDelete': {
      const workflow = selectedWorkflow(state);
      if (!workflow) return state;
      return {
        ...state,
        confirm: {
          text: messages.confirmDeleteWorkflow(workflow.name),
          intent: { kind: 'deleteWorkflow', id: workflow.id },
        },
      };
    }

    case 'role/requestDelete': {
      const role = selectedRole(state);
      if (!role) return state;
      const assigned = state.users.filter((u) => u.roleId === role.id).length;
      if (assigned > 0) return withToast(state, messages.roleReassignFirst(assigned));
      return {
        ...state,
        confirm: {
          text: messages.confirmDeleteRole(role.name),
          intent: { kind: 'deleteRole', id: role.id },
        },
      };
    }

    case 'confirm/accept':
      return acceptConfirm(state);

    case 'confirm/cancel':
      return { ...state, confirm: null };

    case 'workflow/select':
      return { ...state, selectedWorkflowId: action.id };

    case 'workflow/setAgent':
      return {
        ...state,
        workflows: state.workflows.map((w) =>
          w.id === state.selectedWorkflowId ? { ...w, agentId: action.agentId } : w,
        ),
      };

    case 'workflow/addStep':
      return {
        ...state,
        workflows: state.workflows.map((w) =>
          w.id === state.selectedWorkflowId ? { ...w, steps: [...w.steps, action.skillId] } : w,
        ),
      };

    case 'workflow/moveStep':
      return {
        ...state,
        workflows: state.workflows.map((w) => {
          if (w.id !== state.selectedWorkflowId) return w;
          const target = action.index + action.delta;
          if (target < 0 || target >= w.steps.length) return w;
          const steps = [...w.steps];
          const from = steps[action.index];
          const to = steps[target];
          if (from === undefined || to === undefined) return w;
          steps[action.index] = to;
          steps[target] = from;
          return { ...w, steps };
        }),
      };

    case 'workflow/removeStep':
      return {
        ...state,
        workflows: state.workflows.map((w) =>
          w.id === state.selectedWorkflowId
            ? { ...w, steps: w.steps.filter((_, i) => i !== action.index) }
            : w,
        ),
      };

    case 'run/start': {
      if (state.run) return state;
      const workflow = state.workflows.find((w) => w.id === action.workflowId);
      if (!workflow) return state;
      if (workflow.steps.length === 0) return withToast(state, messages.workflowNeedsStep);
      return {
        ...state,
        run: { workflowId: workflow.id, index: 0, total: workflow.steps.length, done: false },
      };
    }

    case 'run/advance':
      return state.run ? { ...state, run: { ...state.run, index: state.run.index + 1 } } : state;

    case 'run/finish':
      return state.run ? { ...state, run: { ...state.run, done: true } } : state;

    case 'run/clear': {
      const run = state.run;
      if (!run) return state;
      const workflow = state.workflows.find((w) => w.id === run.workflowId);
      const cleared: AppState = { ...state, run: null };
      return workflow
        ? withToast(cleared, messages.workflowFinished(workflow.name, run.total))
        : cleared;
    }

    case 'role/select':
      return { ...state, selectedRoleId: action.id };

    case 'role/togglePermission': {
      const role = selectedRole(state);
      if (!role || role.system) return state;
      return {
        ...state,
        roles: state.roles.map((r) =>
          r.id === role.id ? { ...r, perms: { ...r.perms, [action.key]: !r.perms[action.key] } } : r,
        ),
      };
    }

    case 'user/changeRole': {
      const user = state.users.find((u) => u.id === action.userId);
      const role = state.roles.find((r) => r.id === action.roleId);
      if (!user) return state;
      return withToast(
        {
          ...state,
          users: state.users.map((u) =>
            u.id === action.userId ? { ...u, roleId: action.roleId } : u,
          ),
        },
        messages.userRoleChanged(user.name, role ? role.name : ''),
      );
    }

    case 'user/toggleSuspend': {
      const user = state.users.find((u) => u.id === action.userId);
      if (!user) return state;
      const status = user.status === 'Suspenso' ? 'Ativo' : 'Suspenso';
      return withToast(
        {
          ...state,
          users: state.users.map((u) => (u.id === action.userId ? { ...u, status } : u)),
        },
        status === 'Suspenso'
          ? messages.userSuspended(user.name)
          : messages.userReactivated(user.name),
      );
    }

    case 'settings/setProvider': {
      const first = MODELS_BY_PROVIDER[action.provider][0] ?? state.settings.model;
      return {
        ...state,
        settings: { ...state.settings, provider: action.provider, model: first },
      };
    }

    case 'settings/setModel':
      return { ...state, settings: { ...state.settings, model: action.model } };

    case 'settings/setKey':
      return {
        ...state,
        settings: {
          ...state.settings,
          keys: { ...state.settings.keys, [state.settings.provider]: action.value },
        },
      };

    case 'settings/setNumber':
      return { ...state, settings: { ...state.settings, [action.field]: action.value } };

    case 'settings/toggleHardStop':
      return { ...state, settings: { ...state.settings, hardStop: !state.settings.hardStop } };
  }
};

export const selectors = {
  currentUser,
  roleOf,
  selectedWorkflow,
  selectedRole,
  providerName: (state: AppState) => PROVIDER_NAME[state.settings.provider],
};
