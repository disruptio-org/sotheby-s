import { allPermissionKeys, grantedKeys, type PermissionKey, type PermissionMap } from '@sothebys/domain';
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { newSessionId } from '../crypto.js';
import { prisma } from '../db.js';
import { env, isProd } from '../env.js';
import { forbidden, unauthorized } from './errors.js';

export const SESSION_COOKIE = 'sid';

export interface AuthRole {
  id: number;
  name: string;
  desc: string;
  system: boolean;
  perms: PermissionMap;
}

export interface AuthContext {
  userId: number;
  sessionId: string;
  role: AuthRole;
  permissions: Set<PermissionKey>;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

/** System roles are all-powerful by definition, whatever the stored map says. */
export const effectivePermissions = (role: {
  system: boolean;
  perms: PermissionMap;
}): PermissionKey[] => (role.system ? allPermissionKeys() : grantedKeys(role.perms));

const cookieOptions = () =>
  ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    signed: true,
  });

export const issueSession = async (
  reply: FastifyReply,
  userId: number,
  userAgent: string | undefined,
): Promise<void> => {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);

  await prisma.session.create({
    data: { id, userId, expiresAt, ...(userAgent ? { userAgent: userAgent.slice(0, 300) } : {}) },
  });

  void reply.setCookie(SESSION_COOKIE, id, { ...cookieOptions(), expires: expiresAt });
};

export const destroySession = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (request.auth) {
    await prisma.session.deleteMany({ where: { id: request.auth.sessionId } });
  }
  void reply.clearCookie(SESSION_COOKIE, { ...cookieOptions() });
};

/**
 * Resolves the session on every request. Never rejects — routes decide whether
 * anonymous access is acceptable via `requireAuth` / `requirePerm`.
 */
export const registerAuth = (app: FastifyInstance): void => {
  app.decorateRequest('auth', null);

  app.addHook('onRequest', async (request) => {
    const raw = request.cookies[SESSION_COOKIE];
    if (!raw) return;

    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return;

    const session = await prisma.session.findUnique({
      where: { id: unsigned.value },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) return;
    if (session.user.status !== 'ACTIVE') return;

    const role: AuthRole = {
      id: session.user.role.id,
      name: session.user.role.name,
      desc: session.user.role.desc,
      system: session.user.role.system,
      perms: (session.user.role.permissions ?? {}) as PermissionMap,
    };

    request.auth = {
      userId: session.user.id,
      sessionId: session.id,
      role,
      permissions: new Set(effectivePermissions(role)),
    };
  });
};

export const requireAuth: preHandlerHookHandler = async (request) => {
  if (!request.auth) throw unauthorized();
};

export const requirePerm =
  (key: PermissionKey): preHandlerHookHandler =>
  async (request) => {
    if (!request.auth) throw unauthorized();
    if (!request.auth.permissions.has(key)) throw forbidden();
  };

/** Narrowing helper for handlers that already ran `requireAuth`. */
export const authOf = (request: FastifyRequest): AuthContext => {
  if (!request.auth) throw unauthorized();
  return request.auth;
};
