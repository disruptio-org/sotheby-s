import { skillInputSchema, type SkillCategory } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requirePerm } from '../http/auth.js';
import { notFound } from '../http/errors.js';
import { idOf } from '../http/params.js';
import { toSkillDto } from '../mappers.js';
import { reindexWorkflow } from './workflows.js';

export const skillRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/skills', { preHandler: requirePerm('skills.view') }, async () => {
    const rows = await prisma.skill.findMany({ orderBy: { id: 'asc' } });
    return rows.map(toSkillDto);
  });

  app.post('/skills', { preHandler: requirePerm('skills.create') }, async (request, reply) => {
    const input = skillInputSchema.parse(request.body);
    const row = await prisma.skill.create({
      data: { ...input, cat: input.cat as SkillCategory },
    });
    void reply.status(201);
    return toSkillDto(row);
  });

  app.put('/skills/:id', { preHandler: requirePerm('skills.edit') }, async (request) => {
    const id = idOf(request);
    const input = skillInputSchema.parse(request.body);

    const exists = await prisma.skill.count({ where: { id } });
    if (!exists) throw notFound('Skill não encontrada.');

    const row = await prisma.skill.update({
      where: { id },
      data: { ...input, cat: input.cat as SkillCategory },
    });
    return toSkillDto(row);
  });

  app.delete('/skills/:id', { preHandler: requirePerm('skills.delete') }, async (request) => {
    const id = idOf(request);

    // The database cascades the agent links and the workflow steps; the step
    // sequences they leave behind still need closing up.
    const affected = await prisma.workflowStep.findMany({
      where: { skillId: id },
      select: { workflowId: true },
      distinct: ['workflowId'],
    });

    const deleted = await prisma.skill.deleteMany({ where: { id } });
    if (deleted.count === 0) throw notFound('Skill não encontrada.');

    for (const { workflowId } of affected) await reindexWorkflow(workflowId);

    return { ok: true, workflowsTouched: affected.length };
  });
};
