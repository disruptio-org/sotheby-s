import type { ComponentType, SVGProps } from 'react';
import type { PermissionKey, SectionId } from '@sothebys/domain';
import { useStore } from '../state/store';
import { initials } from '../utils/format';
import {
  AgentsIcon,
  AppsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RolesIcon,
  SettingsIcon,
  SignOutIcon,
  SkillsIcon,
  UsersIcon,
  WorkflowsIcon,
} from './icons';

interface NavEntry {
  section: SectionId;
  label: string;
  permission: PermissionKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PLATFORM_NAV: NavEntry[] = [
  { section: 'agents', label: 'Agentes', permission: 'agents.view', Icon: AgentsIcon },
  { section: 'skills', label: 'Skills', permission: 'skills.view', Icon: SkillsIcon },
  { section: 'workflows', label: 'Workflows', permission: 'workflows.view', Icon: WorkflowsIcon },
  { section: 'apps', label: 'Apps', permission: 'apps.view', Icon: AppsIcon },
];

const ADMIN_NAV: NavEntry[] = [
  { section: 'users', label: 'Utilizadores', permission: 'users.view', Icon: UsersIcon },
  { section: 'roles', label: 'Perfis & Permissões', permission: 'roles.view', Icon: RolesIcon },
  { section: 'settings', label: 'Definições', permission: 'settings.view', Icon: SettingsIcon },
];

export function Sidebar() {
  const { state, dispatch, actions, can } = useStore();
  const me = state.session?.user;
  const myRole = state.session?.role;
  const { navOpen, section } = state;

  const visible = (entries: NavEntry[]) => entries.filter((entry) => can(entry.permission));
  const platform = visible(PLATFORM_NAV);
  const admin = visible(ADMIN_NAV);

  const renderItem = ({ section: target, label, Icon }: NavEntry) => (
    <button
      key={target}
      type="button"
      className={`nav-item${section === target ? ' nav-item--active' : ''}`}
      title={label}
      aria-current={section === target ? 'page' : undefined}
      onClick={() => dispatch({ type: 'nav/goTo', section: target })}
    >
      <Icon />
      {navOpen && <span>{label}</span>}
    </button>
  );

  return (
    <nav className={`sidebar${navOpen ? '' : ' sidebar--collapsed'}`} aria-label="Navegação principal">
      <div className="sidebar__brand">
        {navOpen ? (
          <>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar__wordmark">Sotheby&rsquo;s</div>
              <div className="sidebar__tagline">AI Back Office</div>
            </div>
            <button
              type="button"
              className="sidebar__toggle"
              title="Recolher menu"
              aria-label="Recolher menu"
              onClick={() => dispatch({ type: 'nav/toggle' })}
            >
              <ChevronLeftIcon />
            </button>
          </>
        ) : (
          <div className="sidebar__brand-stack">
            <div className="sidebar__monogram" aria-hidden>
              S
            </div>
            <button
              type="button"
              className="sidebar__toggle"
              title="Expandir menu"
              aria-label="Expandir menu"
              onClick={() => dispatch({ type: 'nav/toggle' })}
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      <div className="sidebar__nav">
        {navOpen && platform.length > 0 && <div className="sidebar__group">Plataforma</div>}
        {platform.map(renderItem)}

        {admin.length > 0 &&
          (navOpen ? (
            <div className="sidebar__group sidebar__group--admin">Administração</div>
          ) : (
            <hr className="sidebar__rule" />
          ))}
        {admin.map(renderItem)}
      </div>

      <div className="sidebar__foot">
        <div className="sidebar__avatar" title={me?.name}>
          {me ? initials(me.name) : ''}
        </div>
        {navOpen && (
          <div className="sidebar__identity">
            <div className="sidebar__name">{me?.name}</div>
            <div className="sidebar__role">{myRole?.name}</div>
          </div>
        )}
        <button
          type="button"
          className="sidebar__signout"
          title="Terminar sessão"
          aria-label="Terminar sessão"
          onClick={() => void actions.signOut()}
        >
          <SignOutIcon />
        </button>
      </div>
    </nav>
  );
}
