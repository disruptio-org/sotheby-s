import { allPermissions, permissionsFrom } from './permissions';
import type { Agent, Role, Settings, Skill, User, Workflow } from './types';

/**
 * Seeded demo content. The design is a front-of-house prototype: there is no
 * backend, so the store boots from this snapshot and lives in memory.
 */

export const SEED_ROLES: Role[] = [
  {
    id: 1,
    name: 'Administrador',
    desc: 'Acesso sem restrições a todos os módulos e ações.',
    system: true,
    perms: allPermissions(),
  },
  {
    id: 2,
    name: 'Gestor de Operações de IA',
    desc: 'Cria e executa agentes, skills e workflows. Apenas leitura em utilizadores.',
    system: false,
    perms: permissionsFrom([
      'agents.view',
      'agents.create',
      'agents.edit',
      'agents.run',
      'agents.delete',
      'skills.view',
      'skills.create',
      'skills.edit',
      'skills.delete',
      'workflows.view',
      'workflows.create',
      'workflows.edit',
      'workflows.run',
      'workflows.delete',
      'apps.view',
      'users.view',
    ]),
  },
  {
    id: 3,
    name: 'Consultor',
    desc: 'Visibilidade só de leitura do património de IA. Sem administração.',
    system: false,
    perms: permissionsFrom(['agents.view', 'skills.view', 'workflows.view', 'apps.view']),
  },
];

export const SEED_USERS: User[] = [
  {
    id: 1,
    name: 'Mariana Costa',
    email: 'mariana.costa@sothebysrealty.pt',
    roleId: 1,
    status: 'Ativo',
    last: 'Hoje, 09:12',
  },
  {
    id: 2,
    name: 'Duarte Almeida',
    email: 'duarte.almeida@sothebysrealty.pt',
    roleId: 2,
    status: 'Ativo',
    last: 'Hoje, 08:40',
  },
  {
    id: 3,
    name: 'Sofia Mendes',
    email: 'sofia.mendes@sothebysrealty.pt',
    roleId: 3,
    status: 'Ativo',
    last: 'Ontem, 18:03',
  },
  {
    id: 4,
    name: 'Ricardo Faria',
    email: 'ricardo.faria@sothebysrealty.pt',
    roleId: 3,
    status: 'Convidado',
    last: '—',
  },
];

export const SEED_SKILLS: Skill[] = [
  {
    id: 1,
    name: 'Descrição de Imóvel — PT & EN',
    cat: 'Conteúdo',
    desc: 'Texto editorial de listagem a partir da ficha do imóvel.',
    instr: '',
    updated: '12 ago 2026',
  },
  {
    id: 2,
    name: 'Tradução de Listagens',
    cat: 'Conteúdo',
    desc: 'Tradução EN ⇄ PT afinada ao tom da marca.',
    instr: '',
    updated: '12 ago 2026',
  },
  {
    id: 3,
    name: 'Resumo de Vendas Comparáveis',
    cat: 'Análise',
    desc: 'Tabela de comparáveis e narrativa de preço por freguesia.',
    instr: '',
    updated: '02 ago 2026',
  },
  {
    id: 4,
    name: 'Classificação de Leads',
    cat: 'CRM',
    desc: 'Pontua contactos por orçamento, intenção e prazo.',
    instr: '',
    updated: '28 jul 2026',
  },
  {
    id: 5,
    name: 'Rascunho de E-mail ao Cliente',
    cat: 'Comunicação',
    desc: 'E-mails de seguimento personalizados, no tom da marca.',
    instr: '',
    updated: '21 jul 2026',
  },
  {
    id: 6,
    name: 'Legendas e Alt Text de Fotografia',
    cat: 'Media',
    desc: 'Legendas editoriais para fotografia de imóveis.',
    instr: '',
    updated: '15 jul 2026',
  },
];

export const SEED_AGENTS: Agent[] = [
  {
    id: 1,
    name: 'Redator de Listagens',
    model: 'Claude Sonnet 4.5',
    temp: 0.7,
    status: 'Ativo',
    desc: 'Transforma fichas de imóveis em textos de listagem prontos a publicar, em ambas as línguas.',
    skillIds: [1, 2, 6],
    knowIds: [1, 2],
    toolIds: [3],
    limitRuns: 200,
    limitBudget: 150,
    runs: 412,
    prompt:
      'Escreves para uma marca de imobiliário de luxo em Portugal. Tom: sóbrio, preciso, editorial.',
  },
  {
    id: 2,
    name: 'Concierge de Leads',
    model: 'Claude Opus 4.1',
    temp: 0.3,
    status: 'Ativo',
    desc: 'Qualifica contactos recebidos e redige a primeira resposta personalizada.',
    skillIds: [4, 5],
    knowIds: [3],
    toolIds: [2, 4],
    limitRuns: 500,
    limitBudget: 300,
    runs: 1268,
    prompt: 'És a primeira linha de contacto para pedidos de imóveis de alto valor.',
  },
  {
    id: 3,
    name: 'Analista de Mercado',
    model: 'GPT-5',
    temp: 0.2,
    status: 'Pausado',
    desc: 'Prepara briefings semanais de preços e análises comparáveis por região.',
    skillIds: [3, 5],
    knowIds: [2, 4],
    toolIds: [1, 3],
    limitRuns: 50,
    limitBudget: 100,
    runs: 96,
    prompt: 'Produzes briefings de mercado concisos e fundamentados em dados.',
  },
];

export const SEED_WORKFLOWS: Workflow[] = [
  { id: 1, name: 'Lançamento de Novo Imóvel', agentId: 1, steps: [1, 2, 6, 5] },
  { id: 2, name: 'Triagem de Leads', agentId: 2, steps: [4, 5] },
  { id: 3, name: 'Briefing Semanal de Mercado', agentId: 3, steps: [3, 5] },
];

export const SEED_SETTINGS: Settings = {
  provider: 'anthropic',
  model: 'Claude Sonnet 4.5',
  keys: { anthropic: 'sk-ant-api03-9f2Kv7', openai: '', gemini: '' },
  budget: 750,
  alertPct: 80,
  hardStop: true,
};

/** Ids 1..99 belong to the seed; anything created at runtime starts here. */
export const FIRST_RUNTIME_ID = 100;

/** Date stamped on records edited in-session (the prototype has no clock source). */
export const TODAY_LABEL = '21 ago 2026';
