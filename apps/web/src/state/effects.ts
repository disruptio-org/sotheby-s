import {
  PASSWORD_MIN_LENGTH,
  PROVIDER_NAME,
  type AgentDto,
  type PermissionKey,
  type ProviderId,
  type RoleDto,
  type SkillCategory,
  type UserDto,
} from '@sothebys/domain';
import type { Dispatch, MutableRefObject } from 'react';
import { ApiError, errorMessage } from '../api/client';
import { endpoints } from '../api/endpoints';
import { messages } from './messages';
import type { AppAction, AppState, DataPatch } from './types';

type Send = Dispatch<AppAction>;
type Read = MutableRefObject<AppState>;

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const centsOf = (euros: string) => Math.max(0, Math.round((Number(euros) || 0) * 100));

/**
 * Every asynchronous operation in the app. Each one calls the API and then
 * dispatches the server's response, so the reducer stays pure and the client
 * never invents state the server has not confirmed.
 */
export const makeActions = (dispatch: Send, read: Read) => {
  const toast = (message: string, tone: 'info' | 'error' = 'info') =>
    dispatch({ type: 'toast/push', message, tone });

  const fail = (error: unknown) => {
    if (error instanceof ApiError && error.isAuthError) {
      dispatch({ type: 'session/signedOut' });
      return;
    }
    toast(errorMessage(error), 'error');
  };

  /** Reloads only the slices the caller names — plus whatever they depend on. */
  const refresh = async (parts: (keyof DataPatch)[]): Promise<void> => {
    const has = (part: keyof DataPatch) => parts.includes(part);
    const granted = new Set<PermissionKey>(read.current.session?.permissions ?? []);
    const may = (key: PermissionKey) => granted.has(key);

    const [agents, skills, workflows, users, roles, settings, runs] = await Promise.all([
      has('agents') && may('agents.view') ? endpoints.agents.list() : undefined,
      has('skills') && may('skills.view') ? endpoints.skills.list() : undefined,
      has('workflows') && may('workflows.view') ? endpoints.workflows.list() : undefined,
      has('users') && may('users.view') ? endpoints.users.list() : undefined,
      has('roles') && may('roles.view') ? endpoints.roles.list() : undefined,
      has('settings') && may('settings.view') ? endpoints.settings.get() : undefined,
      has('runs') && may('workflows.view') ? endpoints.runs.list() : undefined,
    ]);

    const patch: DataPatch = {};
    if (agents) patch.agents = agents;
    if (skills) patch.skills = skills;
    if (workflows) patch.workflows = workflows;
    if (users) patch.users = users;
    if (roles) patch.roles = roles;
    if (settings) patch.settings = settings;
    if (runs) patch.runs = runs.runs;
    dispatch({ type: 'data/set', patch });
  };

  const loadEverything = async (): Promise<void> => {
    dispatch({ type: 'data/loading', value: true });
    try {
      const catalog = await endpoints.catalog();
      dispatch({ type: 'data/set', patch: { catalog } });
      await refresh(['agents', 'skills', 'workflows', 'users', 'roles', 'settings', 'runs']);
    } catch (error) {
      fail(error);
    } finally {
      dispatch({ type: 'data/loading', value: false });
    }
  };

  return {
    refresh,
    loadEverything,

    /* ── Session ──────────────────────────────────────────────────────────── */

    bootstrap: async (): Promise<void> => {
      try {
        const session = await endpoints.session.me();
        dispatch({ type: 'boot/ready', session });
        await loadEverything();
      } catch {
        // No valid session is the normal cold-start path, not an error.
        dispatch({ type: 'boot/anonymous' });
      }
    },

    signIn: async (): Promise<void> => {
      const { loginEmail, loginPassword } = read.current;
      if (!loginEmail.trim() || !loginPassword) {
        dispatch({ type: 'login/error', message: messages.errors.credentialsRequired });
        return;
      }

      dispatch({ type: 'login/busy', value: true });
      try {
        const session = await endpoints.session.login(loginEmail.trim(), loginPassword);
        dispatch({ type: 'boot/ready', session });
        await loadEverything();
      } catch (error) {
        dispatch({ type: 'login/error', message: errorMessage(error) });
      }
    },

    signOut: async (): Promise<void> => {
      try {
        await endpoints.session.logout();
      } finally {
        dispatch({ type: 'session/signedOut' });
      }
    },

    /**
     * The three checks below are the same ones the server makes, run first so a
     * typo never leaves the browser. The server stays the authority on whether
     * the current password is right and whether the new one repeats it.
     */
    changePassword: async (): Promise<void> => {
      const form = read.current.passwordChange;
      if (!form || form.busy) return;

      if (!form.current || !form.next || !form.confirm) {
        dispatch({
          type: 'passwordChange/error',
          message: messages.errors.passwordFieldsRequired,
        });
        return;
      }
      if (form.next.length < PASSWORD_MIN_LENGTH) {
        dispatch({
          type: 'passwordChange/error',
          message: messages.errors.passwordTooShort(PASSWORD_MIN_LENGTH),
        });
        return;
      }
      if (form.next !== form.confirm) {
        dispatch({ type: 'passwordChange/error', message: messages.errors.passwordMismatch });
        return;
      }

      dispatch({ type: 'passwordChange/busy', value: true });
      try {
        await endpoints.session.changePassword(form.current, form.next);
        // Closing first clears the typed values; the session that made the
        // change is the one the server kept, so we stay signed in.
        dispatch({ type: 'passwordChange/close' });
        toast(messages.passwordChanged);
      } catch (error) {
        if (error instanceof ApiError && !error.isAuthError) {
          dispatch({ type: 'passwordChange/error', message: error.message });
        } else {
          dispatch({ type: 'passwordChange/close' });
          fail(error);
        }
      }
    },

    /* ── Drawer ───────────────────────────────────────────────────────────── */

    saveDrawer: async (): Promise<void> => {
      const drawer = read.current.drawer;
      if (!drawer || drawer.busy) return;

      const { fields } = drawer;
      const name = fields.name.trim();
      if (!name) {
        dispatch({ type: 'drawer/error', message: messages.errors.nameRequired });
        return;
      }

      dispatch({ type: 'drawer/busy', value: true });

      try {
        switch (drawer.kind) {
          case 'agent': {
            const input = {
              name,
              model: fields.model,
              temp: Number(fields.temp) || 0,
              desc: fields.desc.trim(),
              prompt: fields.prompt,
              skillIds: fields.skillIds,
              knowIds: fields.knowIds,
              toolIds: fields.toolIds,
              limitRuns: Number(fields.limitRuns) || 0,
              limitBudgetCents: centsOf(fields.limitBudget),
            };
            if (drawer.id !== null) {
              await endpoints.agents.update(drawer.id, input);
              toast(messages.agentUpdated);
            } else {
              await endpoints.agents.create(input);
              toast(messages.agentCreated(name));
            }
            await refresh(['agents']);
            break;
          }

          case 'skill': {
            const input = {
              name,
              cat: fields.cat as SkillCategory,
              desc: fields.desc.trim(),
              instr: fields.instr,
            };
            if (drawer.id !== null) {
              await endpoints.skills.update(drawer.id, input);
              toast(messages.skillUpdated);
            } else {
              await endpoints.skills.create(input);
              toast(messages.skillCreated(name));
            }
            await refresh(['skills', 'agents']);
            break;
          }

          case 'user': {
            const email = fields.email.trim();
            if (!isEmail(email)) {
              dispatch({ type: 'drawer/error', message: messages.errors.emailInvalid });
              return;
            }
            await endpoints.users.invite(name, email, Number(fields.roleId));
            toast(messages.inviteSent(email));
            await refresh(['users', 'roles']);
            break;
          }

          case 'workflow': {
            const created = await endpoints.workflows.create(name, Number(fields.agentId));
            toast(messages.workflowCreated);
            await refresh(['workflows']);
            dispatch({ type: 'workflow/select', id: created.id });
            break;
          }

          case 'role': {
            if (drawer.id !== null) {
              await endpoints.roles.update(drawer.id, name, fields.desc.trim());
              toast(messages.roleUpdated);
              await refresh(['roles']);
            } else {
              const created = await endpoints.roles.create(name, fields.desc.trim());
              toast(messages.roleCreated);
              await refresh(['roles']);
              dispatch({ type: 'nav/goTo', section: 'roles' });
              dispatch({ type: 'role/select', id: created.id });
            }
            break;
          }
        }

        dispatch({ type: 'drawer/close' });
      } catch (error) {
        if (error instanceof ApiError && !error.isAuthError) {
          dispatch({ type: 'drawer/error', message: error.message });
        } else {
          dispatch({ type: 'drawer/close' });
          fail(error);
        }
      }
    },

    /* ── Confirmations ────────────────────────────────────────────────────── */

    acceptConfirm: async (): Promise<void> => {
      const confirm = read.current.confirm;
      if (!confirm || confirm.busy) return;
      const { intent } = confirm;

      dispatch({ type: 'confirm/busy', value: true });
      try {
        switch (intent.kind) {
          case 'deleteAgent':
            await endpoints.agents.remove(intent.id);
            toast(messages.agentDeleted);
            await refresh(['agents', 'workflows']);
            break;

          case 'deleteSkill': {
            const result = await endpoints.skills.remove(intent.id);
            toast(messages.skillDeleted(result.workflowsTouched));
            await refresh(['skills', 'agents', 'workflows']);
            break;
          }

          case 'deleteUser':
            await endpoints.users.remove(intent.id);
            toast(messages.userDeleted);
            await refresh(['users', 'roles']);
            break;

          case 'deleteWorkflow':
            await endpoints.workflows.remove(intent.id);
            toast(messages.workflowDeleted);
            await refresh(['workflows', 'runs']);
            break;

          case 'deleteRole':
            await endpoints.roles.remove(intent.id);
            toast(messages.roleDeleted);
            await refresh(['roles']);
            break;

          case 'resetPassword': {
            const user = read.current.users.find((u) => u.id === intent.id);
            const { password } = await endpoints.users.resetPassword(intent.id);
            dispatch({
              type: 'password/reveal',
              userName: user?.name ?? '',
              password,
            });
            await refresh(['users']);
            return;
          }
        }
        dispatch({ type: 'confirm/cancel' });
      } catch (error) {
        dispatch({ type: 'confirm/cancel' });
        fail(error);
      }
    },

    /* ── Agents ───────────────────────────────────────────────────────────── */

    toggleAgentStatus: async (agent: AgentDto): Promise<void> => {
      const next = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      try {
        await endpoints.agents.setStatus(agent.id, next);
        toast(next === 'PAUSED' ? messages.agentPaused(agent.name) : messages.agentResumed(agent.name));
        await refresh(['agents']);
      } catch (error) {
        fail(error);
      }
    },

    /* ── Workflow canvas ──────────────────────────────────────────────────── */

    patchWorkflow: async (
      id: number,
      patch: { name?: string; agentId?: number; steps?: number[] },
    ): Promise<void> => {
      try {
        await endpoints.workflows.update(id, patch);
        await refresh(['workflows']);
      } catch (error) {
        fail(error);
      }
    },

    /* ── Runs ─────────────────────────────────────────────────────────────── */

    startRun: async (workflowId: number): Promise<void> => {
      if (read.current.runBusy) return;
      dispatch({ type: 'run/busy', value: true });
      try {
        const run = await endpoints.runs.start(workflowId, read.current.runInput);
        dispatch({ type: 'run/watch', run });
        toast(messages.runQueued(run.workflowName));
      } catch (error) {
        dispatch({ type: 'run/busy', value: false });
        fail(error);
      }
    },

    cancelRun: async (runId: number): Promise<void> => {
      try {
        await endpoints.runs.cancel(runId);
      } catch (error) {
        fail(error);
      }
    },

    runFinished: async (): Promise<void> => {
      await refresh(['agents', 'settings', 'runs']).catch(() => {});
    },

    /* ── Users ────────────────────────────────────────────────────────────── */

    changeUserRole: async (user: UserDto, roleId: number): Promise<void> => {
      try {
        await endpoints.users.update(user.id, { roleId });
        const role = read.current.roles.find((r) => r.id === roleId);
        toast(messages.userRoleChanged(user.name, role?.name ?? ''));
        await refresh(['users', 'roles']);
      } catch (error) {
        fail(error);
      }
    },

    toggleUserSuspended: async (user: UserDto): Promise<void> => {
      const status = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      try {
        await endpoints.users.update(user.id, { status });
        toast(
          status === 'SUSPENDED'
            ? messages.userSuspended(user.name)
            : messages.userReactivated(user.name),
        );
        await refresh(['users']);
      } catch (error) {
        fail(error);
      }
    },

    /* ── Roles ────────────────────────────────────────────────────────────── */

    togglePermission: async (role: RoleDto, key: PermissionKey): Promise<void> => {
      const next = new Set<PermissionKey>(
        (Object.keys(role.perms) as PermissionKey[]).filter((k) => role.perms[k]),
      );
      if (next.has(key)) next.delete(key);
      else next.add(key);

      try {
        await endpoints.roles.setPermissions(role.id, [...next]);
        await refresh(['roles']);

        // Changing permissions revokes every session on that role — including
        // this one, if the signed-in user holds it.
        if (read.current.session?.role.id === role.id) {
          dispatch({ type: 'session/signedOut' });
          toast(messages.permissionsSaved);
        }
      } catch (error) {
        fail(error);
      }
    },

    /* ── Settings ─────────────────────────────────────────────────────────── */

    updateSettings: async (patch: {
      provider?: ProviderId;
      model?: string;
      hardStop?: boolean;
    }): Promise<void> => {
      try {
        const settings = await endpoints.settings.update(patch);
        dispatch({ type: 'data/set', patch: { settings } });
      } catch (error) {
        fail(error);
      }
    },

    saveSettingsNumbers: async (): Promise<void> => {
      const { settingsDraft } = read.current;
      dispatch({ type: 'settings/busy', value: true });
      try {
        const settings = await endpoints.settings.update({
          budgetCents: centsOf(settingsDraft.budget),
          alertPct: Math.min(100, Math.max(1, Number(settingsDraft.alertPct) || 80)),
        });
        dispatch({ type: 'data/set', patch: { settings } });
        toast(messages.settingsSaved);
      } catch (error) {
        fail(error);
      } finally {
        dispatch({ type: 'settings/busy', value: false });
      }
    },

    saveKey: async (): Promise<void> => {
      const state = read.current;
      const provider = state.settings?.provider;
      if (!provider) return;

      dispatch({ type: 'settings/busy', value: true });
      try {
        const key = state.settingsDraft.key.trim();
        const settings = await endpoints.settings.setKey(provider, key);
        dispatch({ type: 'data/set', patch: { settings } });
        toast(key ? messages.keyStored(PROVIDER_NAME[provider]) : messages.keyCleared(PROVIDER_NAME[provider]));
      } catch (error) {
        fail(error);
      } finally {
        dispatch({ type: 'settings/busy', value: false });
      }
    },

    testKey: async (): Promise<void> => {
      const provider = read.current.settings?.provider;
      if (!provider) return;

      dispatch({ type: 'settings/busy', value: true });
      try {
        const result = await endpoints.settings.testKey(provider);
        if (result.ok) toast(messages.keyVerified(PROVIDER_NAME[provider]));
        else toast(messages.keyRejected(PROVIDER_NAME[provider], result.detail ?? 'chave recusada'), 'error');
      } catch (error) {
        fail(error);
      } finally {
        dispatch({ type: 'settings/busy', value: false });
      }
    },
  };
};

export type Actions = ReturnType<typeof makeActions>;
