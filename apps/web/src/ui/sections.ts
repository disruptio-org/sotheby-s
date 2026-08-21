import type { SectionId } from '@sothebys/domain';

/** Page copy for each section — headings, kicker group and description. */

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
