import {
  permissionsFrom,
  roleInputSchema,
  rolePermissionsSchema,
  type PermissionKey,
} from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requirePerm } from '../http/auth.js';
import { conflict, notFound, unprocessable } from '../http/errors.js';
import { idOf } from '../http/params.js';
import { toRoleDto } from '../mappers.js';

const withCounts = async () => {
  const [rows, counts] = await Promise.all([
    prisma.role.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.groupBy({ by: ['roleId'], _count: { _all: true } }),
  ]);
  const byRole = new Map(counts.map((c) => [c.roleId, c._count._all]));
  return rows.map((row) => toRoleDto(row, byRole.get(row.id) ?? 0));
};

const loadEditable = async (id: number) => {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw notFound('Perfil não encontrado.');
  if (role.system) throw unprocessable('Perfil de sistema — as permissões estão bloqueadas.');
  return role;
};

export const roleRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/roles', { preHandler: requirePerm('roles.view') }, withCounts);

  app.post('/roles', { preHandler: requirePerm('roles.create') }, async (request, reply) => {
    const input = roleInputSchema.parse(request.body);

    const taken = await prisma.role.findFirst({ where: { name: input.name } });
    if (taken) throw conflict('Já existe um perfil com este nome.', 'role_name_taken');

    const row = await prisma.role.create({
      data: { name: input.name, desc: input.desc, system: false, permissions: {} },
    });
    void reply.status(201);
    return toRoleDto(row, 0);
  });

  app.put('/roles/:id', { preHandler: requirePerm('roles.edit') }, async (request) => {
    const id = idOf(request);
    await loadEditable(id);
    const input = roleInputSchema.parse(request.body);

    const taken = await prisma.role.findFirst({ where: { name: input.name, id: { not: id } } });
    if (taken) throw conflict('Já existe um perfil com este nome.', 'role_name_taken');

    const row = await prisma.role.update({
      where: { id },
      data: { name: input.name, desc: input.desc },
    });
    const userCount = await prisma.user.count({ where: { roleId: id } });
    return toRoleDto(row, userCount);
  });

  app.put('/roles/:id/permissions', { preHandler: requirePerm('roles.edit') }, async (request) => {
    const id = idOf(request);
    await loadEditable(id);
    const { permissions } = rolePermissionsSchema.parse(request.body);

    const row = await prisma.role.update({
      where: { id },
      data: { permissions: permissionsFrom(permissions as PermissionKey[]) },
    });
    const userCount = await prisma.user.count({ where: { roleId: id } });

    // Anyone holding this role must pick up the new grants on their next
    // request, so their sessions are invalidated rather than left stale.
    await prisma.session.deleteMany({ where: { user: { roleId: id } } });

    return toRoleDto(row, userCount);
  });

  app.delete('/roles/:id', { preHandler: requirePerm('roles.delete') }, async (request) => {
    const id = idOf(request);
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw notFound('Perfil não encontrado.');
    if (role.system) throw unprocessable('Perfis de sistema não podem ser eliminados.');

    const assigned = await prisma.user.count({ where: { roleId: id } });
    if (assigned > 0) {
      throw unprocessable(
        `${assigned} utilizador${assigned === 1 ? '' : 'es'} usa${assigned === 1 ? '' : 'm'} este perfil. Reatribua-o${assigned === 1 ? '' : 's'} antes de eliminar.`,
      );
    }

    await prisma.role.delete({ where: { id } });
    return { ok: true };
  });
};
