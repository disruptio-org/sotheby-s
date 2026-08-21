import { firstVisibleSection, permissionKey, type SectionId } from '@sothebys/domain';
import { useEffect, type ComponentType } from 'react';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Drawer } from './components/Drawer';
import { PageHeader } from './components/PageHeader';
import { PasswordDialog } from './components/PasswordDialog';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { AgentsScreen } from './screens/AgentsScreen';
import { AppsScreen } from './screens/AppsScreen';
import { ClaimScreen } from './screens/ClaimScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RolesScreen } from './screens/RolesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { UsersScreen } from './screens/UsersScreen';
import { WorkflowsScreen } from './screens/WorkflowsScreen';
import { useStore } from './state/store';

const SCREENS: Record<SectionId, ComponentType> = {
  agents: AgentsScreen,
  skills: SkillsScreen,
  workflows: WorkflowsScreen,
  apps: AppsScreen,
  users: UsersScreen,
  roles: RolesScreen,
  settings: SettingsScreen,
};

export function App() {
  const { state, dispatch, can } = useStore();
  const { status, section } = state;
  const signedIn = status === 'ready';
  const mayViewSection = can(permissionKey(section, 'view'));

  // A permission change can strip view access to the section already on
  // screen — fall back to the first section the new grants allow.
  useEffect(() => {
    if (!signedIn || mayViewSection) return;
    dispatch({ type: 'nav/goTo', section: firstVisibleSection(can) });
  }, [signedIn, mayViewSection, can, dispatch]);

  if (status === 'booting') {
    return (
      <div className="app">
        <div className="boot" role="status" aria-live="polite">
          <div className="boot__wordmark">Sotheby&rsquo;s</div>
          <div className="boot__line">A ligar ao back office…</div>
        </div>
      </div>
    );
  }

  const Section = SCREENS[section];

  return (
    <div className="app">
      {signedIn ? (
        <div className="app__shell">
          <Sidebar />
          <main className="main">
            <div className="page">
              <PageHeader section={section} />
              {mayViewSection && <Section />}
            </div>
          </main>
        </div>
      ) : status === 'claim' ? (
        <ClaimScreen />
      ) : (
        <LoginScreen />
      )}

      <Drawer />
      <ConfirmDialog />
      <PasswordDialog />
      <ChangePasswordDialog />
      <Toasts />
    </div>
  );
}
