import type {
  Agent,
  PermissionKey,
  ProviderId,
  Role,
  SectionId,
  Settings,
  Skill,
  User,
  Workflow,
} from '../domain/types';

export type Screen = 'login' | 'app';

export type DrawerKind = 'agent' | 'skill' | 'user' | 'workflow' | 'role';

/** Chip groups an agent drawer can toggle. */
export type ChipField = 'skillIds' | 'knowIds' | 'toolIds';

/**
 * One flat bag of form fields shared by every drawer variant. Each variant
 * reads only the fields it renders, which keeps the change handler a single
 * name/value pair regardless of which drawer is open.
 */
export interface DrawerFields {
  name: string;
  email: string;
  roleId: string;
  model: string;
  temp: string;
  desc: string;
  prompt: string;
  instr: string;
  cat: string;
  agentId: string;
  limitRuns: string;
  limitBudget: string;
  skillIds: number[];
  knowIds: number[];
  toolIds: number[];
}

export type TextField = Exclude<keyof DrawerFields, ChipField>;

export interface DrawerState {
  kind: DrawerKind;
  /** `null` when creating, the record id when editing. */
  id: number | null;
  fields: DrawerFields;
  error: string;
}

/** A destructive action parked behind the confirmation dialog. */
export type ConfirmIntent =
  | { kind: 'deleteAgent'; id: number }
  | { kind: 'deleteSkill'; id: number }
  | { kind: 'deleteUser'; id: number }
  | { kind: 'deleteWorkflow'; id: number }
  | { kind: 'deleteRole'; id: number };

export interface ConfirmState {
  text: string;
  intent: ConfirmIntent;
}

export interface Toast {
  id: number;
  message: string;
}

/** A workflow execution in flight. */
export interface RunState {
  workflowId: number;
  /** Index of the step currently running. */
  index: number;
  total: number;
  /** Every step finished; the run lingers briefly before clearing. */
  done: boolean;
}

export interface AppState {
  screen: Screen;
  section: SectionId;
  navOpen: boolean;
  loginEmail: string;
  loginPassword: string;
  currentUserId: number;
  roles: Role[];
  users: User[];
  skills: Skill[];
  agents: Agent[];
  workflows: Workflow[];
  selectedWorkflowId: number;
  selectedRoleId: number;
  settings: Settings;
  drawer: DrawerState | null;
  confirm: ConfirmState | null;
  toasts: Toast[];
  run: RunState | null;
  nextId: number;
  nextToastId: number;
}

export type AppAction =
  | { type: 'login/setEmail'; value: string }
  | { type: 'login/setPassword'; value: string }
  | { type: 'login/submit' }
  | { type: 'session/signOut' }
  | { type: 'nav/goTo'; section: SectionId }
  | { type: 'nav/toggle' }
  | { type: 'toast/push'; message: string }
  | { type: 'toast/dismiss'; id: number }
  | { type: 'drawer/open'; kind: DrawerKind; id?: number }
  | { type: 'drawer/close' }
  | { type: 'drawer/setField'; field: TextField; value: string }
  | { type: 'drawer/toggleChip'; field: ChipField; id: number }
  | { type: 'drawer/save' }
  | { type: 'confirm/accept' }
  | { type: 'confirm/cancel' }
  | { type: 'agents/requestDelete'; id: number }
  | { type: 'skills/requestDelete'; id: number }
  | { type: 'users/requestDelete'; id: number }
  | { type: 'workflow/select'; id: number }
  | { type: 'workflow/setAgent'; agentId: number }
  | { type: 'workflow/addStep'; skillId: number }
  | { type: 'workflow/moveStep'; index: number; delta: number }
  | { type: 'workflow/removeStep'; index: number }
  | { type: 'workflow/requestDelete' }
  | { type: 'run/start'; workflowId: number }
  | { type: 'run/advance' }
  | { type: 'run/finish' }
  | { type: 'run/clear' }
  | { type: 'role/select'; id: number }
  | { type: 'role/togglePermission'; key: PermissionKey }
  | { type: 'role/requestDelete' }
  | { type: 'user/changeRole'; userId: number; roleId: number }
  | { type: 'user/toggleSuspend'; userId: number }
  | { type: 'settings/setProvider'; provider: ProviderId }
  | { type: 'settings/setModel'; model: string }
  | { type: 'settings/setKey'; value: string }
  | { type: 'settings/setNumber'; field: 'budget' | 'alertPct'; value: number }
  | { type: 'settings/toggleHardStop' };
