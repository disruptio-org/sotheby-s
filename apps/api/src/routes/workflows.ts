import { workflowCreateSchema, workflowUpdateSchema } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requirePerm } from '../http/auth.js';
import { notFound, unprocessable } from '../http/errors.js';
import { idOf } from '../http/params.js';
import { toWorkflowDto, workflowInclude } from '../mappers.js';

/**
 * Closes gaps left in a step sequence — after a cascading skill delete the
 * remaining indices can read 0, 2, 3 and would collide on the next insert.
 */
export const reindexWorkflow = async (workflowId: number): Promise<void> => {
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId },
    orderBy: { index: 'asc' },
    select: { id: true },
  });

  await prisma.$transaction([
    // Park the rows out of range first so the unique index never collides
    // while the new numbering is written.
    ...steps.map((step, i) =>
      prisma.workflowStep.update({ where: { id: step.id }, data: { index: -1 - i } }),
    ),
    ...steps.map((step, i) =>
      prisma.workflowStep.update({ where: { id: step.id }, data: { index: i } }),
    ),
  ]);
};

const replaceSteps = async (workflowId: number, skillIds: number[]): Promise<void> => {
  const known = await prisma.skill.count({ where: { id: { in: skillIds } } });
  if (known !== new Set(skillIds).size) throw unprocessable('Skill inexistente no workflow.');

  await prisma.$transaction([
    prisma.workflowStep.deleteMany({ where: { workflowId } }),
    prisma.workflowStep.createMany({
      data: skillIds.map((skillId, index) => ({ workflowId, skillId, index })),
    }),
  ]);
};

export const workflowRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/workflows', { preHandler: requirePerm('workflows.view') }, async () => {
    const rows = await prisma.workflow.findMany({
      include: workflowInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toWorkflowDto);
  });

  app.post('/workflows', { preHandler: requirePerm('workflows.create') }, async (request, reply) => {
    const input = workflowCreateSchema.parse(request.body);

    const agent = await prisma.agent.count({ where: { id: input.agentId } });
    if (!agent) throw unprocessable('Agente inexistente.');

    const row = await prisma.workflow.create({
      data: { name: input.name, agentId: input.agentId },
      include: workflowInclude,
    });
    void reply.status(201);
    return toWorkflowDto(row);
  });

  app.patch('/workflows/:id', { preHandler: requirePerm('workflows.edit') }, async (request) => {
    const id = idOf(request);
    const input = workflowUpdateSchema.parse(request.body);

    const exists = await prisma.workflow.count({ where: { id } });
    if (!exists) throw notFound('Workflow não encontrado.');

    if (input.agentId !== undefined) {
      const agent = await prisma.agent.count({ where: { id: input.agentId } });
      if (!agent) throw unprocessable('Agente inexistente.');
    }

    if (input.steps !== undefined) await replaceSteps(id, input.steps);

    const row = await prisma.workflow.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
      },
      include: workflowInclude,
    });

    return toWorkflowDto(row);
  });

  app.delete('/workflows/:id', { preHandler: requirePerm('workflows.delete') }, async (request) => {
    const deleted = await prisma.workflow.deleteMany({ where: { id: idOf(request) } });
    if (deleted.count === 0) throw notFound('Workflow não encontrado.');
    return { ok: true };
  });
};
