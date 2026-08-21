import type {
  KnowledgeFile,
  ProviderId,
  SectionId,
  SkillCategory,
  ToolIntegration,
} from './types';

export const KNOWLEDGE_FILES: KnowledgeFile[] = [
  { id: 1, name: 'Guia de Estilo da Marca.pdf' },
  { id: 2, name: 'Feed do Portefólio de Imóveis' },
  { id: 3, name: 'FAQ de Clientes.docx' },
  { id: 4, name: 'Tabela de Preços 2026.xlsx' },
];

export const TOOL_INTEGRATIONS: ToolIntegration[] = [
  { id: 1, name: 'Pesquisa Web' },
  { id: 2, name: 'CRM' },
  { id: 3, name: 'Base de Imóveis' },
  { id: 4, name: 'E-mail' },
  { id: 5, name: 'Calendário' },
];

export const MODELS_BY_PROVIDER: Record<ProviderId, string[]> = {
  anthropic: ['Claude Opus 4.1', 'Claude Sonnet 4.5', 'Claude Haiku 4.5'],
  openai: ['GPT-5', 'GPT-5 mini', 'GPT-4.1'],
  gemini: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'],
};

export const ALL_MODELS: string[] = [
  ...MODELS_BY_PROVIDER.anthropic,
  ...MODELS_BY_PROVIDER.openai,
  ...MODELS_BY_PROVIDER.gemini,
];

export const PROVIDERS: { id: ProviderId; name: string; vendor: string }[] = [
  { id: 'anthropic', name: 'Claude', vendor: 'Anthropic' },
  { id: 'openai', name: 'GPT', vendor: 'OpenAI' },
  { id: 'gemini', name: 'Gemini', vendor: 'Google' },
];

export const PROVIDER_NAME: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Google',
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Conteúdo',
  'Análise',
  'CRM',
  'Comunicação',
  'Media',
  'Jurídico',
];

export interface SectionMeta {
  group: 'Plataforma' | 'Administração';
  title: string;
  desc: string;
}

export const SECTION_META: Record<SectionId, SectionMeta> = {
  agents: {
    group: 'Plataforma',
    title: 'Agentes',
    desc: 'Personas de IA configuradas — cada uma com um modelo, um prompt de sistema e um conjunto de skills associadas.',
  },
  skills: {
    group: 'Plataforma',
    title: 'Skills',
    desc: 'Capacidades de IA reutilizáveis. As skills associam-se a agentes e sequenciam-se em workflows.',
  },
  workflows: {
    group: 'Plataforma',
    title: 'Workflows',
    desc: 'Sequências de skills executadas de ponta a ponta por um agente, ao toque de um botão.',
  },
  apps: {
    group: 'Plataforma',
    title: 'Apps',
    desc: 'Ferramentas internas à medida, construídas sobre agentes e workflows.',
  },
  users: {
    group: 'Administração',
    title: 'Utilizadores',
    desc: 'Todas as pessoas com acesso ao back office e o perfil que define o que cada uma pode fazer.',
  },
  roles: {
    group: 'Administração',
    title: 'Perfis & Permissões',
    desc: 'Cada ação é uma permissão individual. Componha permissões em perfis e atribua perfis aos utilizadores.',
  },
  settings: {
    group: 'Administração',
    title: 'Definições',
    desc: 'Fornecedor de LLM, modelo predefinido, chaves de API e controlo de créditos da plataforma.',
  },
};

/** Estimated euro cost per agent run, used by the credits panel. */
export const COST_PER_RUN = 0.18;
