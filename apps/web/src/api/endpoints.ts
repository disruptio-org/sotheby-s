import type {
  AgentDto,
  AgentInput,
  KnowledgeFileDto,
  ModelSpec,
  PermissionKey,
  ProviderId,
  RoleDto,
  RunDto,
  SessionDto,
  SettingsDto,
  SkillDto,
  SkillInput,
  ToolIntegrationDto,
  UserDto,
  UserStatus,
  WorkflowDto,
} from '@sothebys/domain';
import { api } from './client.js';

export interface CatalogDto {
  knowledgeFiles: KnowledgeFileDto[];
  tools: ToolIntegrationDto[];
  models: ModelSpec[];
}

export const endpoints = {
  session: {
    login: (email: string, password: string) =>
      api.post<SessionDto>('/auth/login', { email, password }),
    me: () => api.get<SessionDto>('/auth/me'),
    logout: () => api.post<{ ok: true }>('/auth/logout'),
    changePassword: (currentPassword: string, newPassword: string) =>
      api.post<{ ok: true }>('/auth/password', { currentPassword, newPassword }),
  },

  catalog: () => api.get<CatalogDto>('/catalog'),

  agents: {
    list: () => api.get<AgentDto[]>('/agents'),
    create: (input: AgentInput) => api.post<AgentDto>('/agents', input),
    update: (id: number, input: AgentInput) => api.put<AgentDto>(`/agents/${id}`, input),
    setStatus: (id: number, status: 'ACTIVE' | 'PAUSED') =>
      api.patch<AgentDto>(`/agents/${id}/status`, { status }),
    remove: (id: number) => api.delete<{ ok: true }>(`/agents/${id}`),
  },

  skills: {
    list: () => api.get<SkillDto[]>('/skills'),
    create: (input: SkillInput) => api.post<SkillDto>('/skills', input),
    update: (id: number, input: SkillInput) => api.put<SkillDto>(`/skills/${id}`, input),
    remove: (id: number) => api.delete<{ ok: true; workflowsTouched: number }>(`/skills/${id}`),
  },

  workflows: {
    list: () => api.get<WorkflowDto[]>('/workflows'),
    create: (name: string, agentId: number) =>
      api.post<WorkflowDto>('/workflows', { name, agentId }),
    update: (id: number, patch: { name?: string; agentId?: number; steps?: number[] }) =>
      api.patch<WorkflowDto>(`/workflows/${id}`, patch),
    remove: (id: number) => api.delete<{ ok: true }>(`/workflows/${id}`),
  },

  runs: {
    list: (take = 25) => api.get<{ runs: RunDto[]; nextCursor: number | null }>(`/runs?take=${take}`),
    start: (workflowId: number, input: string) => api.post<RunDto>('/runs', { workflowId, input }),
    get: (id: number) => api.get<RunDto>(`/runs/${id}`),
    cancel: (id: number) => api.post<{ ok: true }>(`/runs/${id}/cancel`),
    /** SSE stream of progress for one run. */
    events: (id: number) => new EventSource(`/api/runs/${id}/events`),
  },

  users: {
    list: () => api.get<UserDto[]>('/users'),
    invite: (name: string, email: string, roleId: number) =>
      api.post<UserDto>('/users', { name, email, roleId }),
    update: (id: number, patch: { name?: string; roleId?: number; status?: UserStatus }) =>
      api.patch<UserDto>(`/users/${id}`, patch),
    resetPassword: (id: number) => api.post<{ password: string }>(`/users/${id}/reset-password`),
    remove: (id: number) => api.delete<{ ok: true }>(`/users/${id}`),
  },

  roles: {
    list: () => api.get<RoleDto[]>('/roles'),
    create: (name: string, desc: string) => api.post<RoleDto>('/roles', { name, desc }),
    update: (id: number, name: string, desc: string) =>
      api.put<RoleDto>(`/roles/${id}`, { name, desc }),
    setPermissions: (id: number, permissions: PermissionKey[]) =>
      api.put<RoleDto>(`/roles/${id}/permissions`, { permissions }),
    remove: (id: number) => api.delete<{ ok: true }>(`/roles/${id}`),
  },

  settings: {
    get: () => api.get<SettingsDto>('/settings'),
    update: (patch: {
      provider?: ProviderId;
      model?: string;
      budgetCents?: number;
      alertPct?: number;
      hardStop?: boolean;
    }) => api.patch<SettingsDto>('/settings', patch),
    setKey: (provider: ProviderId, key: string) =>
      api.put<SettingsDto>('/settings/key', { provider, key }),
    testKey: (provider: ProviderId) =>
      api.post<{ ok: boolean; detail?: string }>('/settings/key/test', { provider, key: '' }),
  },
};
