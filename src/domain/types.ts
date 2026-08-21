/** Domain vocabulary for the AI Back Office. */

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

export interface Role {
  id: number;
  name: string;
  desc: string;
  /** System roles are locked: always all permissions, never editable or deletable. */
  system: boolean;
  perms: PermissionMap;
}

export type UserStatus = 'Ativo' | 'Convidado' | 'Suspenso';

export interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
  status: UserStatus;
  /** Last sign-in, pre-formatted for display. */
  last: string;
}

export type SkillCategory =
  | 'Conteúdo'
  | 'Análise'
  | 'CRM'
  | 'Comunicação'
  | 'Media'
  | 'Jurídico';

export interface Skill {
  id: number;
  name: string;
  cat: SkillCategory;
  desc: string;
  instr: string;
  updated: string;
}

export type AgentStatus = 'Ativo' | 'Pausado';

export interface Agent {
  id: number;
  name: string;
  model: string;
  temp: number;
  status: AgentStatus;
  desc: string;
  prompt: string;
  skillIds: number[];
  knowIds: number[];
  toolIds: number[];
  limitRuns: number;
  limitBudget: number;
  runs: number;
}

export interface Workflow {
  id: number;
  name: string;
  agentId: number;
  /** Ordered skill ids — the sequence the executing agent runs. */
  steps: number[];
}

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export interface Settings {
  provider: ProviderId;
  model: string;
  keys: Record<ProviderId, string>;
  budget: number;
  alertPct: number;
  hardStop: boolean;
}

export interface KnowledgeFile {
  id: number;
  name: string;
}

export interface ToolIntegration {
  id: number;
  name: string;
}
