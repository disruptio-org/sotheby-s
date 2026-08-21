import { userInviteSchema, userUpdateSchema, type UserStatus } from '@sothebys/domain';
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../crypto.js';
import { prisma } from '../db.js';
import { authOf, requirePerm } from '../http/auth.js';
import { conflict, notFound, unprocessable } from '../http/errors.js';
import { idOf } from '../http/params.js';
import { toUserDto } from '../mappers.js';

/** 18 random bytes ≈ 144 bits, shown to the admin once and never stored raw. */
const temporaryPassword = (): string => randomBytes(18).toString('base64url');

/**
 * The platform must never end up with no one who can administer it. Any change
 * that would remove the last active holder of a system role is refused.
 */
const assertNotLastAdmin = async (userId: number): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { select: { system: true } } },
  });
  if (!user?.role.system || user.status !== 'ACTIVE') return;

  const remaining = await prisma.user.count({
    where: { id: { not: userId }, status: 'ACTIVE', role: { system: true } },
  });
  if (remaining === 0) {
    throw unprocessable('Não pode remover o último administrador ativo da plataforma.');
  }
};

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/users', { preHandler: requirePerm('users.view') }, async () => {
    const rows = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toUserDto);
  });

  app.post('/users', { preHandler: requirePerm('users.create') }, async (request, reply) => {
    const input = userInviteSchema.parse(request.body);

    const role = await prisma.role.count({ where: { id: input.roleId } });
    if (!role) throw unprocessable('Perfil inexistente.');

    const taken = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (taken) throw conflict('Já existe um utilizador com este e-mail.', 'email_taken');

    // Invitations start without a password: the account cannot sign in until an
    // administrator issues one through the reset endpoint.
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        roleId: input.roleId,
        status: 'INVITED',
      },
    });

    void reply.status(201);
    return toUserDto(row);
  });

  app.patch('/users/:id', { preHandler: requirePerm('users.edit') }, async (request) => {
    const id = idOf(request);
    const input = userUpdateSchema.parse(request.body);
    const auth = authOf(request);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound('Utilizador não encontrado.');

    if (input.status !== undefined && input.status !== 'ACTIVE') {
      if (id === auth.userId) throw unprocessable('Não pode suspender a sua própria conta.');
      await assertNotLastAdmin(id);
    }
    if (input.roleId !== undefined && input.roleId !== user.roleId) {
      const role = await prisma.role.count({ where: { id: input.roleId } });
      if (!role) throw unprocessable('Perfil inexistente.');
      if (id === auth.userId) throw unprocessable('Não pode alterar o seu próprio perfil.');
      await assertNotLastAdmin(id);
    }

    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
        ...(input.status !== undefined ? { status: input.status as UserStatus } : {}),
      },
    });

    // A suspended account loses its sessions immediately.
    if (input.status !== undefined && input.status !== 'ACTIVE') {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    return toUserDto(row);
  });

  app.post(
    '/users/:id/reset-password',
    { preHandler: requirePerm('users.reset') },
    async (request) => {
      const id = idOf(request);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw notFound('Utilizador não encontrado.');

      const password = temporaryPassword();
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(password),
          // Accepting a reset activates a pending invitation.
          ...(user.status === 'INVITED' ? { status: 'ACTIVE' as const } : {}),
        },
      });
      await prisma.session.deleteMany({ where: { userId: id } });

      // Returned once, to be handed over out of band. It is never stored raw.
      return { password };
    },
  );

  app.delete('/users/:id', { preHandler: requirePerm('users.delete') }, async (request) => {
    const id = idOf(request);
    if (id === authOf(request).userId) throw unprocessable('Não pode eliminar a sua própria conta.');
    await assertNotLastAdmin(id);

    const deleted = await prisma.user.deleteMany({ where: { id } });
    if (deleted.count === 0) throw notFound('Utilizador não encontrado.');
    return { ok: true };
  });
};
