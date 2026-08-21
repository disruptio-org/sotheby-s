import { MODEL_BY_ID, PROVIDER_NAME, runCreateSchema, type RunEvent } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { agentUsage, platformSpendCents, usageOf } from '../billing.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { authOf, requirePerm } from '../http/auth.js';
import { notFound, unprocessable } from '../http/errors.js';
import { idOf, pagingOf } from '../http/params.js';
import { runInclude, toRunDto } from '../mappers.js';
import { subscribe } from '../runner/bus.js';
import { executeRun } from '../runner/engine.js';
import { cancel, enqueue } from '../runner/queue.js';
import { keyStatus, loadSettings } from '../settings-service.js';

const HEARTBEAT_MS = 25_000;

export const runRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/runs', { preHandler: requirePerm('workflows.run') }, async (request, reply) => {
    const input = runCreateSchema.parse(request.body);
    const auth = authOf(request);

    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      include: {
        agent: true,
        steps: { orderBy: { index: 'asc' }, include: { skill: { select: { name: true } } } },
      },
    });
    if (!workflow) throw notFound('Workflow não encontrado.');
    if (workflow.steps.length === 0) {
      throw unprocessable('Adicione pelo menos um passo antes de executar.');
    }
    if (workflow.agent.status !== 'ACTIVE') {
      throw unprocessable(`O agente «${workflow.agent.name}» está pausado.`);
    }

    const model = workflow.agent.model;
    const spec = MODEL_BY_ID[model];
    if (!spec) throw unprocessable(`O modelo «${model}» já não está disponível.`);

    if (!env.RUN_SIMULATE) {
      const keys = await keyStatus();
      if (!keys[spec.provider]) {
        throw unprocessable(
          `Sem chave de API para ${PROVIDER_NAME[spec.provider]}. Configure-a em Definições antes de executar.`,
        );
      }
    }

    const [settings, spent, usage] = await Promise.all([
      loadSettings(),
      platformSpendCents(),
      agentUsage(),
    ]);

    if (settings.hardStop && settings.budgetCents > 0 && spent >= settings.budgetCents) {
      throw unprocessable('Orçamento mensal esgotado — execuções suspensas.');
    }

    const agentUse = usageOf(usage, workflow.agentId);
    if (workflow.agent.limitRuns > 0 && agentUse.runsThisMonth >= workflow.agent.limitRuns) {
      throw unprocessable(
        `O agente «${workflow.agent.name}» atingiu o limite de ${workflow.agent.limitRuns} execuções este mês.`,
      );
    }
    if (
      workflow.agent.limitBudgetCents > 0 &&
      agentUse.spentCents >= workflow.agent.limitBudgetCents
    ) {
      throw unprocessable(`O agente «${workflow.agent.name}» esgotou o orçamento deste mês.`);
    }

    const run = await prisma.run.create({
      data: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        agentId: workflow.agentId,
        agentName: workflow.agent.name,
        startedById: auth.userId,
        input: input.input,
        model,
        steps: {
          create: workflow.steps.map((step) => ({
            index: step.index,
            skillId: step.skillId,
            skillName: step.skill.name,
          })),
        },
      },
      include: runInclude,
    });

    enqueue(run.id, () => executeRun(run.id));

    void reply.status(201);
    return toRunDto(run);
  });

  app.get('/runs', { preHandler: requirePerm('workflows.view') }, async (request) => {
    const { take, cursor } = pagingOf(request);
    const rows = await prisma.run.findMany({
      include: runInclude,
      orderBy: { id: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const last = rows.at(-1);
    return {
      runs: rows.map(toRunDto),
      nextCursor: rows.length === take && last ? last.id : null,
    };
  });

  app.get('/runs/:id', { preHandler: requirePerm('workflows.view') }, async (request) => {
    const row = await prisma.run.findUnique({ where: { id: idOf(request) }, include: runInclude });
    if (!row) throw notFound('Execução não encontrada.');
    return toRunDto(row);
  });

  app.post('/runs/:id/cancel', { preHandler: requirePerm('workflows.run') }, async (request) => {
    const id = idOf(request);
    const run = await prisma.run.findUnique({ where: { id } });
    if (!run) throw notFound('Execução não encontrada.');
    if (run.status !== 'QUEUED' && run.status !== 'RUNNING') {
      throw unprocessable('Esta execução já terminou.');
    }

    const stopped = cancel(id);
    if (!stopped || run.status === 'QUEUED') {
      // Nothing was in flight to abort — close the record out directly.
      await prisma.runStep.updateMany({
        where: { runId: id, status: { in: ['PENDING', 'RUNNING'] } },
        data: { status: 'SKIPPED', finishedAt: new Date() },
      });
      await prisma.run.update({
        where: { id },
        data: { status: 'CANCELED', finishedAt: new Date() },
      });
    }

    return { ok: true };
  });

  /** Live progress for one run. Closes itself once the run reaches a terminal state. */
  app.get('/runs/:id/events', { preHandler: requirePerm('workflows.view') }, async (request, reply) => {
    const id = idOf(request);
    const run = await prisma.run.findUnique({ where: { id }, include: runInclude });
    if (!run) throw notFound('Execução não encontrada.');

    reply.hijack();
    const stream = reply.raw;
    stream.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Tell any reverse proxy not to buffer this response.
      'x-accel-buffering': 'no',
    });

    const send = (event: RunEvent) => {
      stream.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let unsubscribe: () => void = () => {};
    const heartbeat = setInterval(() => stream.write(': ping\n\n'), HEARTBEAT_MS);
    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      stream.end();
    };

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    unsubscribe = subscribe(id, (event) => {
      send(event);
      if (event.type === 'run.finished') close();
    });

    send({ type: 'run.snapshot', run: toRunDto(run) });

    // A run that already finished gets the snapshot and nothing more.
    if (run.status !== 'QUEUED' && run.status !== 'RUNNING') close();
  });
};
