import type { ActionId, PermissionKey, PermissionMap, Role, SectionId } from './types';

export interface PermissionAction {
  id: ActionId;
  label: string;
}

export interface PermissionModule {
  id: SectionId;
  label: string;
  actions: PermissionAction[];
}

/**
 * The permission matrix rendered on Perfis & Permissões — and the single source
 * of truth for which `section.action` pairs exist at all.
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'agents',
    label: 'Agentes',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Criar' },
      { id: 'edit', label: 'Configurar' },
      { id: 'run', label: 'Executar testes' },
      { id: 'delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Criar' },
      { id: 'edit', label: 'Editar' },
      { id: 'delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Criar' },
      { id: 'edit', label: 'Editar e reordenar' },
      { id: 'run', label: 'Executar' },
      { id: 'delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'apps',
    label: 'Apps',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Criar' },
    ],
  },
  {
    id: 'users',
    label: 'Utilizadores',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Convidar' },
      { id: 'edit', label: 'Editar e atribuir perfis' },
      { id: 'reset', label: 'Repor palavras-passe' },
      { id: 'delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'roles',
    label: 'Perfis e permissões',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'create', label: 'Criar' },
      { id: 'edit', label: 'Editar permissões' },
      { id: 'delete', label: 'Eliminar' },
    ],
  },
  {
    id: 'settings',
    label: 'Definições',
    actions: [
      { id: 'view', label: 'Ver' },
      { id: 'edit', label: 'Editar' },
    ],
  },
];

export const permissionKey = (section: SectionId, action: ActionId): PermissionKey =>
  `${section}.${action}`;

/** Every permission in the catalogue, granted. Used to seed the Administrador role. */
export const allPermissions = (): PermissionMap => {
  const perms: PermissionMap = {};
  for (const mod of PERMISSION_MODULES) {
    for (const action of mod.actions) perms[permissionKey(mod.id, action.id)] = true;
  }
  return perms;
};

export const permissionsFrom = (keys: PermissionKey[]): PermissionMap => {
  const perms: PermissionMap = {};
  for (const key of keys) perms[key] = true;
  return perms;
};

export const roleGrants = (role: Role | undefined, key: PermissionKey): boolean =>
  !!role?.perms[key];

/** Order the sidebar uses when picking a landing section after sign-in. */
export const SECTION_ORDER: SectionId[] = [
  'agents',
  'skills',
  'workflows',
  'apps',
  'users',
  'roles',
];

/** First section in sidebar order the holder may view — the post-login landing page. */
export const firstVisibleSection = (has: (key: PermissionKey) => boolean): SectionId =>
  SECTION_ORDER.find((section) => has(permissionKey(section, 'view'))) ?? 'agents';
