import type { AgentStatus, ProviderId, RunStatus, SkillCategory, UserStatus } from './types.js';

/* ── Providers and models ─────────────────────────────────────────────────── */

export interface ModelSpec {
  /** The id sent to the provider's API. */
  id: string;
  /** What the back office shows. */
  label: string;
  provider: ProviderId;
  /**
   * List price in EUR cents per million tokens. These are estimates used to
   * bill runs against the monthly budget — check them against the provider's
   * current price list before trusting the numbers on Definições.
   */
  inCentsPerMTok: number;
  outCentsPerMTok: number;
}

export const MODELS: ModelSpec[] = [
  {
    id: 'claude-opus-4-1',
    label: 'Claude Opus 4.1',
    provider: 'anthropic',
    inCentsPerMTok: 1380,
    outCentsPerMTok: 6900,
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    inCentsPerMTok: 276,
    outCentsPerMTok: 1380,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    inCentsPerMTok: 92,
    outCentsPerMTok: 460,
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    inCentsPerMTok: 115,
    outCentsPerMTok: 920,
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    provider: 'openai',
    inCentsPerMTok: 23,
    outCentsPerMTok: 184,
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    inCentsPerMTok: 184,
    outCentsPerMTok: 736,
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    inCentsPerMTok: 115,
    outCentsPerMTok: 920,
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
    inCentsPerMTok: 28,
    outCentsPerMTok: 230,
  },
];

export const MODEL_BY_ID: Record<string, ModelSpec> = Object.fromEntries(
  MODELS.map((model) => [model.id, model]),
);

export const MODELS_BY_PROVIDER: Record<ProviderId, ModelSpec[]> = {
  anthropic: MODELS.filter((m) => m.provider === 'anthropic'),
  openai: MODELS.filter((m) => m.provider === 'openai'),
  gemini: MODELS.filter((m) => m.provider === 'gemini'),
};

export const PROVIDERS: { id: ProviderId; name: string; vendor: string }[] = [
  { id: 'anthropic', name: 'Claude', vendor: 'Anthropic' },
  { id: 'openai', name: 'GPT', vendor: 'OpenAI' },
  { id: 'gemini', name: 'Gemini', vendor: 'Google' },
];

export const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'gemini'];

export const PROVIDER_NAME: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Google',
};

/** Cost of one model call, in EUR cents, rounded up so a run is never free. */
export const costOfCall = (modelId: string, tokensIn: number, tokensOut: number): number => {
  const spec = MODEL_BY_ID[modelId];
  if (!spec) return 0;
  const cents =
    (tokensIn * spec.inCentsPerMTok) / 1_000_000 + (tokensOut * spec.outCentsPerMTok) / 1_000_000;
  return cents > 0 ? Math.max(1, Math.round(cents)) : 0;
};

/* ── Display labels (pt-PT) ───────────────────────────────────────────────── */

export const SKILL_CATEGORIES: SkillCategory[] = [
  'CONTENT',
  'ANALYSIS',
  'CRM',
  'COMMUNICATION',
  'MEDIA',
  'LEGAL',
];

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  CONTENT: 'Conteúdo',
  ANALYSIS: 'Análise',
  CRM: 'CRM',
  COMMUNICATION: 'Comunicação',
  MEDIA: 'Media',
  LEGAL: 'Jurídico',
};

export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED'];

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INVITED: 'Convidado',
  SUSPENDED: 'Suspenso',
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  QUEUED: 'Em fila',
  RUNNING: 'A executar',
  SUCCEEDED: 'Concluído',
  FAILED: 'Falhou',
  CANCELED: 'Cancelado',
};
