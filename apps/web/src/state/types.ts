import type {
  AgentDto,
  ClaimKind,
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

export type BootStatus = 'booting' | 'anonymous' | 'claim' | 'ready';

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
  | { kind: 'resetPassword'; id: number }
  | { kind: 'resendInvitation'; id: number };

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

/**
 * The set-password screen, reached by following a link in an e-mail — either an
 * invitation or a password reset. It lives outside the session entirely: nobody
 * is signed in while it is on screen.
 */
export interface ClaimState {
  kind: ClaimKind;
  /** Held in memory only — the reducer never puts it back in the address bar. */
  token: string;
  stage: ClaimStage;
  name: string;
  /** The profile waiting for an invitee. Null on a reset, which grants nothing. */
  roleName: string | null;
  password: string;
  confirm: string;
  /** Why the link itself is no good. Set only in the `refused` stage. */
  refusal: string;
  /** A problem with what was typed. The form stays on screen. */
  error: string;
  busy: boolean;
}

export type ClaimStage = 'checking' | 'ready' | 'refused';

export type ClaimField = 'password' | 'confirm';

/**
 * Asking for a reset link. `sent` is set on any answer at all, because the
 * server's answer is the same whether or not the address holds an account.
 */
export interface ForgotState {
  email: string;
  busy: boolean;
  sent: boolean;
}

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

  /** The forgotten-password form, `null` unless the sign-in screen opened it. */
  forgot: ForgotState | null;

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

  /** The link being redeemed, `null` unless the boot found a token. */
  claim: ClaimState | null;
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
  | { type: 'passwordChange/error'; message: string }
  | { type: 'claim/open'; kind: ClaimKind; token: string }
  | { type: 'claim/ready'; name: string; roleName: string | null }
  | { type: 'claim/refused'; message: string }
  | { type: 'claim/setField'; field: ClaimField; value: string }
  | { type: 'claim/busy'; value: boolean }
  | { type: 'claim/error'; message: string }
  | { type: 'claim/dismiss' }
  | { type: 'forgot/open' }
  | { type: 'forgot/close' }
  | { type: 'forgot/setEmail'; value: string }
  | { type: 'forgot/busy'; value: boolean }
  | { type: 'forgot/sent' };

export type { PermissionKey, ProviderId, UserStatus };
