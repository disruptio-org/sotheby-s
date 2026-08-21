import { useEffect } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Drawer } from './components/Drawer';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { firstVisibleSection, permissionKey } from './domain/permissions';
import type { SectionId } from './domain/types';
import { AgentsScreen } from './screens/AgentsScreen';
import { AppsScreen } from './screens/AppsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RolesScreen } from './screens/RolesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { UsersScreen } from './screens/UsersScreen';
import { WorkflowsScreen } from './screens/WorkflowsScreen';
import { useStore } from './state/store';

const SCREENS: Record<SectionId, () => JSX.Element> = {
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
  const { screen, section } = state;
  const mayViewSection = can(permissionKey(section, 'view'));

  // A role change can strip view access to the section already on screen —
  // fall back to the first section the new role is allowed to see.
  useEffect(() => {
    if (screen !== 'app' || mayViewSection) return;
    dispatch({ type: 'nav/goTo', section: firstVisibleSection(can) });
  }, [screen, mayViewSection, can, dispatch]);

  const Section = SCREENS[section];

  return (
    <div className="app">
      {screen === 'app' ? (
        <div className="app__shell">
          <Sidebar />
          <main className="main">
            <div className="page">
              <PageHeader section={section} />
              {mayViewSection && <Section />}
            </div>
          </main>
        </div>
      ) : (
        <LoginScreen />
      )}

      <Drawer />
      <ConfirmDialog />
      <Toasts />
    </div>
  );
}
