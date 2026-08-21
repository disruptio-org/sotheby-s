/**
 * Domain vocabulary for the AI Back Office, shared by the API and the web app.
 *
 * Two conventions worth knowing:
 *  - Enum-like values are canonical uppercase identifiers, not display copy.
 *    Portuguese labels live in `catalogs.ts` so the database never stores a
 *    translation.
 *  - Money is always integer cents (EUR). Never floats.
 */

export type SectionId =
  | 'agents'
  | 'skills'
  | 'workflows'
  | 'apps'
  | 'users'
  | 'roles'
  | 'settings';

export type ActionId = 'view' | 'create' | 'edit' | 'run' | 'delete' | 'reset';

/** e.g. `agents.edit` — every action is an individually grantable permission. */
export type PermissionKey = `${SectionId}.${ActionId}`;

export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type AgentStatus = 'ACTIVE' | 'PAUSED';

export type SkillCategory =
  | 'CONTENT'
  | 'ANALYSIS'
  | 'CRM'
  | 'COMMUNICATION'
  | 'MEDIA'
  | 'LEGAL';

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export type RunStepStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

/* ── Read models (what the API returns) ───────────────────────────────────── */

export interface RoleDto {
  id: number;
  name: string;
  desc: string;
  /** System roles hold every permission and can never be edited or deleted. */
  system: boolean;
  perms: PermissionMap;
  userCount: number;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  roleId: number;
  status: UserStatus;
  /** ISO 8601, or null for an account that has never signed in. */
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SkillDto {
  id: number;
  name: string;
  cat: SkillCategory;
  desc: string;
  instr: string;
  updatedAt: string;
}

export interface AgentDto {
  id: number;
  name: string;
  /** Provider model id, e.g. `claude-sonnet-4-5`. */
  model: string;
  temp: number;
  status: AgentStatus;
  desc: string;
  prompt: string;
  skillIds: number[];
  knowIds: number[];
  toolIds: number[];
  /** Ceiling on runs per calendar month; 0 means unlimited. */
  limitRuns: number;
  /** Ceiling on spend per calendar month, in cents; 0 means unlimited. */
  limitBudgetCents: number;
  /** Lifetime completed runs. */
  runCount: number;
  /** Spend in the current calendar month, in cents. */
  spentCents: number;
}

export interface WorkflowDto {
  id: number;
  name: string;
  agentId: number;
  /** Ordered skill ids — the sequence the executing agent runs. */
  steps: number[];
}

export interface SettingsDto {
  provider: ProviderId;
  model: string;
  /**
   * Whether a key is on file per provider. The keys themselves are encrypted
   * at rest and never leave the server.
   */
  keyConfigured: Record<ProviderId, boolean>;
  budgetCents: number;
  alertPct: number;
  hardStop: boolean;
  /** Platform-wide spend in the current calendar month, in cents. */
  spentCents: number;
}

export interface KnowledgeFileDto {
  id: number;
  name: string;
}

export interface ToolIntegrationDto {
  id: number;
  name: string;
}

export interface RunStepDto {
  id: number;
  index: number;
  skillId: number;
  skillName: string;
  status: RunStepStatus;
  output: string | null;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface RunDto {
  id: number;
  workflowId: number;
  workflowName: string;
  agentId: number;
  agentName: string;
  status: RunStatus;
  /** Free-text input the run was started with, passed to the first step. */
  input: string;
  steps: RunStepDto[];
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  error: string | null;
  startedById: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface SessionDto {
  user: UserDto;
  role: RoleDto;
  /** Flattened grants — the client mirrors these, the server re-checks them. */
  permissions: PermissionKey[];
}

/* ── Server-sent events on a run ──────────────────────────────────────────── */

export type RunEvent =
  | { type: 'run.snapshot'; run: RunDto }
  | { type: 'run.started'; runId: number; startedAt: string }
  | { type: 'step.started'; runId: number; index: number; startedAt: string }
  | { type: 'step.finished'; runId: number; index: number; step: RunStepDto }
  | { type: 'run.finished'; runId: number; run: RunDto };
