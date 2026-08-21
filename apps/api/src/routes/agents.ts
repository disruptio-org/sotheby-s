import { agentInputSchema, agentStatusSchema, type AgentInput } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { agentUsage, usageOf } from '../billing.js';
import { prisma } from '../db.js';
import { requirePerm } from '../http/auth.js';
import { notFound, unprocessable } from '../http/errors.js';
import { idOf } from '../http/params.js';
import { agentInclude, toAgentDto } from '../mappers.js';

/** Rejects references to skills, files or tools that do not exist. */
const assertReferences = async (input: AgentInput): Promise<void> => {
  const [skills, files, tools] = await Promise.all([
    prisma.skill.count({ where: { id: { in: input.skillIds } } }),
    prisma.knowledgeFile.count({ where: { id: { in: input.knowIds } } }),
    prisma.toolIntegration.count({ where: { id: { in: input.toolIds } } }),
  ]);

  if (skills !== new Set(input.skillIds).size) throw unprocessable('Skill inexistente.');
  if (files !== new Set(input.knowIds).size) throw unprocessable('Ficheiro inexistente.');
  if (tools !== new Set(input.toolIds).size) throw unprocessable('Ferramenta inexistente.');
};

const linkData = (input: AgentInput) => ({
  skills: { create: [...new Set(input.skillIds)].map((skillId) => ({ skillId })) },
  knowledge: {
    create: [...new Set(input.knowIds)].map((knowledgeFileId) => ({ knowledgeFileId })),
  },
  tools: { create: [...new Set(input.toolIds)].map((toolId) => ({ toolId })) },
});

export const agentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/agents', { preHandler: requirePerm('agents.view') }, async () => {
    const [rows, usage] = await Promise.all([
      prisma.agent.findMany({ include: agentInclude, orderBy: { id: 'asc' } }),
      agentUsage(),
    ]);
    return rows.map((row) => toAgentDto(row, usageOf(usage, row.id)));
  });

  app.get('/agents/:id', { preHandler: requirePerm('agents.view') }, async (request) => {
    const row = await prisma.agent.findUnique({ where: { id: idOf(request) }, include: agentInclude });
    if (!row) throw notFound('Agente não encontrado.');
    const usage = await agentUsage();
    return toAgentDto(row, usageOf(usage, row.id));
  });

  app.post('/agents', { preHandler: requirePerm('agents.create') }, async (request, reply) => {
    const input = agentInputSchema.parse(request.body);
    await assertReferences(input);

    const row = await prisma.agent.create({
      data: {
        name: input.name,
        model: input.model,
        temp: input.temp,
        desc: input.desc,
        prompt: input.prompt,
        limitRuns: input.limitRuns,
        limitBudgetCents: input.limitBudgetCents,
        ...linkData(input),
      },
      include: agentInclude,
    });

    void reply.status(201);
    return toAgentDto(row, { runCount: 0, spentCents: 0 });
  });

  app.put('/agents/:id', { preHandler: requirePerm('agents.edit') }, async (request) => {
    const id = idOf(request);
    const input = agentInputSchema.parse(request.body);
    await assertReferences(input);

    const exists = await prisma.agent.count({ where: { id } });
    if (!exists) throw notFound('Agente não encontrado.');

    // Replacing the link rows wholesale keeps the write idempotent.
    const row = await prisma.$transaction(async (tx) => {
      await tx.agentSkill.deleteMany({ where: { agentId: id } });
      await tx.agentKnowledge.deleteMany({ where: { agentId: id } });
      await tx.agentTool.deleteMany({ where: { agentId: id } });

      return tx.agent.update({
        where: { id },
        data: {
          name: input.name,
          model: input.model,
          temp: input.temp,
          desc: input.desc,
          prompt: input.prompt,
          limitRuns: input.limitRuns,
          limitBudgetCents: input.limitBudgetCents,
          ...linkData(input),
        },
        include: agentInclude,
      });
    });

    const usage = await agentUsage();
    return toAgentDto(row, usageOf(usage, row.id));
  });

  app.patch('/agents/:id/status', { preHandler: requirePerm('agents.edit') }, async (request) => {
    const id = idOf(request);
    const { status } = agentStatusSchema.parse(request.body);
    const exists = await prisma.agent.count({ where: { id } });
    if (!exists) throw notFound('Agente não encontrado.');

    const row = await prisma.agent.update({ where: { id }, data: { status }, include: agentInclude });
    const usage = await agentUsage();
    return toAgentDto(row, usageOf(usage, row.id));
  });

  app.delete('/agents/:id', { preHandler: requirePerm('agents.delete') }, async (request) => {
    const id = idOf(request);

    const workflows = await prisma.workflow.count({ where: { agentId: id } });
    if (workflows > 0) {
      throw unprocessable(
        `Este agente executa ${workflows} workflow${workflows === 1 ? '' : 's'}. Reatribua-o${workflows === 1 ? '' : 's'} antes de eliminar.`,
      );
    }

    const deleted = await prisma.agent.deleteMany({ where: { id } });
    if (deleted.count === 0) throw notFound('Agente não encontrado.');
    return { ok: true };
  });
};
