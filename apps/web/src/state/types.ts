import type {
  AgentDto,
  PermissionKey,
  ProviderId,
  RoleDto,
  RunDto,
  RunEvent,
  SectionId,
  SessionDto,
  SettingsDto,
  SkillDto,
  UserDto,
  UserStatus,
  WorkflowDto,
} from '@sothebys/domain';
import type { CatalogDto } from '../api/endpoints';

export type BootStatus = 'booting' | 'anonymous' | 'ready';

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
  /** Euros, as typed. Converted to cents on save. */
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
  busy: boolean;
}

/** A destructive action parked behind the confirmation dialog. */
export type ConfirmIntent =
  | { kind: 'deleteAgent'; id: number }
  | { kind: 'deleteSkill'; id: number }
  | { kind: 'deleteUser'; id: number }
  | { kind: 'deleteWorkflow'; id: number }
  | { kind: 'deleteRole'; id: number }
  | { kind: 'resetPassword'; id: number };

export interface ConfirmState {
  text: string;
  intent: ConfirmIntent;
  busy: boolean;
}

/**
 * The self-service password change dialog. Held only while it is open — the
 * reducer drops the whole object on close so no password lingers in the store.
 */
export interface PasswordChangeState {
  current: string;
  next: string;
  confirm: string;
  error: string;
  busy: boolean;
}

export type PasswordField = 'current' | 'next' | 'confirm';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

/** Editable copies of the settings values that save on an explicit action. */
export interface SettingsDraft {
  budget: string;
  alertPct: string;
  key: string;
}

export interface AppState {
  status: BootStatus;
  session: SessionDto | null;

  loginEmail: string;
  loginPassword: string;
  loginError: string;
  loginBusy: boolean;

  section: SectionId;
  navOpen: boolean;

  loading: boolean;
  agents: AgentDto[];
  skills: SkillDto[];
  workflows: WorkflowDto[];
  users: UserDto[];
  roles: RoleDto[];
  settings: SettingsDto | null;
  catalog: CatalogDto | null;
  runs: RunDto[];

  selectedWorkflowId: number;
  selectedRoleId: number;

  /** The run being watched live, if any. */
  activeRun: RunDto | null;
  runBusy: boolean;
  runInput: string;

  settingsDraft: SettingsDraft;
  settingsBusy: boolean;

  drawer: DrawerState | null;
  confirm: ConfirmState | null;
  toasts: Toast[];
  nextToastId: number;

  /** A one-time password handed back by a reset, shown until dismissed. */
  revealedPassword: { userName: string; password: string } | null;

  /** The password change dialog, `null` when closed. */
  passwordChange: PasswordChangeState | null;
}

export interface DataPatch {
  agents?: AgentDto[];
  skills?: SkillDto[];
  workflows?: WorkflowDto[];
  users?: UserDto[];
  roles?: RoleDto[];
  settings?: SettingsDto;
  catalog?: CatalogDto;
  runs?: RunDto[];
}

export type AppAction =
  | { type: 'boot/anonymous' }
  | { type: 'boot/ready'; session: SessionDto }
  | { type: 'session/signedOut' }
  | { type: 'login/setEmail'; value: string }
  | { type: 'login/setPassword'; value: string }
  | { type: 'login/busy'; value: boolean }
  | { type: 'login/error'; message: string }
  | { type: 'data/loading'; value: boolean }
  | { type: 'data/set'; patch: DataPatch }
  | { type: 'nav/goTo'; section: SectionId }
  | { type: 'nav/toggle' }
  | { type: 'toast/push'; message: string; tone?: 'info' | 'error' }
  | { type: 'toast/dismiss'; id: number }
  | { type: 'drawer/open'; kind: DrawerKind; id?: number | null }
  | { type: 'drawer/close' }
  | { type: 'drawer/setField'; field: TextField; value: string }
  | { type: 'drawer/toggleChip'; field: ChipField; id: number }
  | { type: 'drawer/busy'; value: boolean }
  | { type: 'drawer/error'; message: string }
  | { type: 'confirm/request'; text: string; intent: ConfirmIntent }
  | { type: 'confirm/busy'; value: boolean }
  | { type: 'confirm/cancel' }
  | { type: 'workflow/select'; id: number }
  | { type: 'role/select'; id: number }
  | { type: 'run/setInput'; value: string }
  | { type: 'run/busy'; value: boolean }
  | { type: 'run/watch'; run: RunDto }
  | { type: 'run/event'; event: RunEvent }
  | { type: 'run/clear' }
  | { type: 'settings/setDraft'; field: keyof SettingsDraft; value: string }
  | { type: 'settings/busy'; value: boolean }
  | { type: 'password/reveal'; userName: string; password: string }
  | { type: 'password/hide' }
  | { type: 'passwordChange/open' }
  | { type: 'passwordChange/close' }
  | { type: 'passwordChange/setField'; field: PasswordField; value: string }
  | { type: 'passwordChange/busy'; value: boolean }
  | { type: 'passwordChange/error'; message: string };

export type { PermissionKey, ProviderId, UserStatus };
