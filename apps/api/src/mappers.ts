import {
  type AgentDto,
  type AgentStatus,
  type PermissionMap,
  type RoleDto,
  type RunDto,
  type RunStatus,
  type RunStepDto,
  type RunStepStatus,
  type SkillCategory,
  type SkillDto,
  type UserDto,
  type UserStatus,
  type WorkflowDto,
  sanitizePermissions,
} from '@sothebys/domain';

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export const toRoleDto = (
  row: { id: number; name: string; desc: string; system: boolean; permissions: unknown },
  userCount: number,
): RoleDto => ({
  id: row.id,
  name: row.name,
  desc: row.desc,
  system: row.system,
  perms: sanitizePermissions((row.permissions ?? {}) as PermissionMap),
  userCount,
});

export const toUserDto = (row: {
  id: number;
  name: string;
  email: string;
  roleId: number;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}): UserDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  roleId: row.roleId,
  status: row.status,
  lastLoginAt: iso(row.lastLoginAt),
  createdAt: row.createdAt.toISOString(),
});

export const toSkillDto = (row: {
  id: number;
  name: string;
  cat: SkillCategory;
  desc: string;
  instr: string;
  updatedAt: Date;
}): SkillDto => ({
  id: row.id,
  name: row.name,
  cat: row.cat,
  desc: row.desc,
  instr: row.instr,
  updatedAt: row.updatedAt.toISOString(),
});

export interface AgentRow {
  id: number;
  name: string;
  model: string;
  temp: number;
  status: AgentStatus;
  desc: string;
  prompt: string;
  limitRuns: number;
  limitBudgetCents: number;
  skills: { skillId: number }[];
  knowledge: { knowledgeFileId: number }[];
  tools: { toolId: number }[];
}

export const toAgentDto = (
  row: AgentRow,
  usage: { runCount: number; spentCents: number },
): AgentDto => ({
  id: row.id,
  name: row.name,
  model: row.model,
  temp: row.temp,
  status: row.status,
  desc: row.desc,
  prompt: row.prompt,
  skillIds: row.skills.map((s) => s.skillId),
  knowIds: row.knowledge.map((k) => k.knowledgeFileId),
  toolIds: row.tools.map((t) => t.toolId),
  limitRuns: row.limitRuns,
  limitBudgetCents: row.limitBudgetCents,
  runCount: usage.runCount,
  spentCents: usage.spentCents,
});

export const toWorkflowDto = (row: {
  id: number;
  name: string;
  agentId: number;
  steps: { index: number; skillId: number }[];
}): WorkflowDto => ({
  id: row.id,
  name: row.name,
  agentId: row.agentId,
  steps: [...row.steps].sort((a, b) => a.index - b.index).map((step) => step.skillId),
});

export const toRunStepDto = (row: {
  id: number;
  index: number;
  skillId: number | null;
  skillName: string;
  status: RunStepStatus;
  output: string | null;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  startedAt: Date | null;
  finishedAt: Date | null;
}): RunStepDto => ({
  id: row.id,
  index: row.index,
  skillId: row.skillId ?? 0,
  skillName: row.skillName,
  status: row.status,
  output: row.output,
  error: row.error,
  tokensIn: row.tokensIn,
  tokensOut: row.tokensOut,
  costCents: row.costCents,
  startedAt: iso(row.startedAt),
  finishedAt: iso(row.finishedAt),
});

export interface RunRow {
  id: number;
  workflowId: number | null;
  workflowName: string;
  agentId: number | null;
  agentName: string;
  startedById: number | null;
  status: RunStatus;
  input: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  steps: Parameters<typeof toRunStepDto>[0][];
}

export const toRunDto = (row: RunRow): RunDto => ({
  id: row.id,
  workflowId: row.workflowId ?? 0,
  workflowName: row.workflowName,
  agentId: row.agentId ?? 0,
  agentName: row.agentName,
  startedById: row.startedById ?? 0,
  status: row.status,
  input: row.input,
  steps: [...row.steps].sort((a, b) => a.index - b.index).map(toRunStepDto),
  tokensIn: row.tokensIn,
  tokensOut: row.tokensOut,
  costCents: row.costCents,
  error: row.error,
  createdAt: row.createdAt.toISOString(),
  startedAt: iso(row.startedAt),
  finishedAt: iso(row.finishedAt),
});

/** Prisma include shapes reused across routes, kept next to their mappers. */
export const agentInclude = {
  skills: { select: { skillId: true } },
  knowledge: { select: { knowledgeFileId: true } },
  tools: { select: { toolId: true } },
} as const;

export const workflowInclude = {
  steps: { select: { index: true, skillId: true }, orderBy: { index: 'asc' } },
} as const;

export const runInclude = {
  steps: { orderBy: { index: 'asc' } },
} as const;
