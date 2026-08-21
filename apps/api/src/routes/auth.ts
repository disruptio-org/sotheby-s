import { changePasswordSchema, loginSchema, type SessionDto } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from '../crypto.js';
import { prisma } from '../db.js';
import {
  authOf,
  destroySession,
  effectivePermissions,
  issueSession,
  requireAuth,
} from '../http/auth.js';
import { badRequest, unauthorized } from '../http/errors.js';
import { toRoleDto, toUserDto } from '../mappers.js';

export const sessionPayload = async (userId: number): Promise<SessionDto> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: true },
  });
  const userCount = await prisma.user.count({ where: { roleId: user.roleId } });
  const role = toRoleDto(user.role, userCount);

  return {
    user: toUserDto(user),
    role,
    permissions: effectivePermissions({ system: role.system, perms: role.perms }),
  };
};

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const { email, password } = loginSchema.parse(request.body);

      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });

      // One message for every failure mode, so the endpoint cannot be used to
      // enumerate which addresses exist.
      const invalid = unauthorized('Credenciais inválidas.');
      if (!user?.passwordHash) {
        // Spend comparable time even when there is no hash to check.
        await verifyPassword(password, 'scrypt$65536$8$1$AAAA$AAAA');
        throw invalid;
      }
      if (!(await verifyPassword(password, user.passwordHash))) throw invalid;

      if (user.status === 'SUSPENDED') {
        throw unauthorized('Conta suspensa. Contacte um administrador.');
      }
      if (user.status === 'INVITED') {
        throw unauthorized('Convite por aceitar. Peça a reposição da palavra-passe.');
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await issueSession(reply, user.id, request.headers['user-agent']);

      return sessionPayload(user.id);
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    await destroySession(request, reply);
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (request) =>
    sessionPayload(authOf(request).userId),
  );

  app.post('/auth/password', { preHandler: requireAuth }, async (request) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    const auth = authOf(request);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw badRequest('A palavra-passe atual não está correta.');
    }
    if (currentPassword === newPassword) {
      throw badRequest('A nova palavra-passe tem de ser diferente da atual.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    // Every other session for this account is now stale.
    await prisma.session.deleteMany({
      where: { userId: user.id, id: { not: auth.sessionId } },
    });

    return { ok: true };
  });
};
