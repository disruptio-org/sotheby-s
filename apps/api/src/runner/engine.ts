import { MODEL_BY_ID, costOfCall, type ProviderId } from '@sothebys/domain';
import { platformSpendCents } from '../billing.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { runInclude, toRunDto, toRunStepDto } from '../mappers.js';
import { keyFor, loadSettings } from '../settings-service.js';
import { publish } from './bus.js';
import { providerFor, simulated, type Provider } from './providers.js';
import { signalFor } from './queue.js';

const MAX_OUTPUT_TOKENS = 2048;
/** How much of the previous step's output is carried into the next one. */
const CONTEXT_LIMIT = 8000;

class BudgetExceeded extends Error {}

const loadRun = (runId: number) =>
  prisma.run.findUnique({
    where: { id: runId },
    include: {
      ...runInclude,
      agent: {
        include: {
          knowledge: { include: { knowledgeFile: { select: { name: true } } } },
          tools: { include: { tool: { select: { name: true } } } },
        },
      },
    },
  });

type LoadedRun = NonNullable<Awaited<ReturnType<typeof loadRun>>>;

/**
 * The agent's persona plus the resources it was configured with. Knowledge
 * files and tools are named rather than attached — wiring them to real content
 * is the next step for the runner, and the prompt is honest about that.
 */
const systemPrompt = (run: LoadedRun): string => {
  const agent = run.agent;
  const lines = [agent?.prompt?.trim() || 'És um assistente do back office.'];

  const files = agent?.knowledge.map((k) => k.knowledgeFile.name) ?? [];
  if (files.length > 0) lines.push(`Fontes de conhecimento disponíveis: ${files.join(', ')}.`);

  const tools = agent?.tools.map((t) => t.tool.name) ?? [];
  if (tools.length > 0) lines.push(`Ferramentas autorizadas: ${tools.join(', ')}.`);

  lines.push('Responde em português de Portugal.');
  return lines.join('\n\n');
};

const stepPrompt = (instruction: string, context: string): string =>
  context.trim()
    ? `<contexto>\n${context.slice(0, CONTEXT_LIMIT)}\n</contexto>\n\n${instruction}`
    : instruction;

const resolveProvider = async (
  model: string,
): Promise<{ provider: Provider; apiKey: string; providerId: ProviderId }> => {
  const spec = MODEL_BY_ID[model];
  if (!spec) throw new Error(`Modelo «${model}» não está no catálogo.`);

  if (env.RUN_SIMULATE) {
    return { provider: simulated, apiKey: 'simulated', providerId: spec.provider };
  }

  const apiKey = await keyFor(spec.provider);
  if (!apiKey) {
    throw new Error(`Sem chave de API configurada para ${spec.provider}. Defina-a em Definições.`);
  }
  return { provider: providerFor(spec.provider), apiKey, providerId: spec.provider };
};

/** Refuses to spend past the platform budget when hard stop is on. */
const assertBudget = async (): Promise<void> => {
  const settings = await loadSettings();
  if (!settings.hardStop || settings.budgetCents <= 0) return;
  const spent = await platformSpendCents();
  if (spent >= settings.budgetCents) {
    throw new BudgetExceeded('Orçamento mensal esgotado — execuções suspensas.');
  }
};

export const executeRun = async (runId: number): Promise<void> => {
  const run = await loadRun(runId);
  if (!run || run.status !== 'QUEUED') return;

  const signal = signalFor(runId) ?? new AbortController().signal;
  const startedAt = new Date();

  await prisma.run.update({ where: { id: runId }, data: { status: 'RUNNING', startedAt } });
  publish({ type: 'run.started', runId, startedAt: startedAt.toISOString() });

  let context = run.input;
  let tokensIn = 0;
  let tokensOut = 0;
  let costCents = 0;
  let failure: string | null = null;
  let canceled = false;

  const steps = [...run.steps].sort((a, b) => a.index - b.index);

  for (const step of steps) {
    if (signal.aborted) {
      canceled = true;
      break;
    }

    try {
      await assertBudget();
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Orçamento esgotado.';
      break;
    }

    const stepStartedAt = new Date();
    await prisma.runStep.update({
      where: { id: step.id },
      data: { status: 'RUNNING', startedAt: stepStartedAt },
    });
    publish({
      type: 'step.started',
      runId,
      index: step.index,
      startedAt: stepStartedAt.toISOString(),
    });

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), env.RUN_STEP_TIMEOUT_MS);
    const onAbort = () => timeout.abort();
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      const skill = step.skillId
        ? await prisma.skill.findUnique({ where: { id: step.skillId } })
        : null;
      const instruction = skill?.instr.trim() || `Executa a skill «${step.skillName}».`;

      const { provider, apiKey } = await resolveProvider(run.model);
      const result = await provider.complete(
        {
          model: run.model,
          system: systemPrompt(run),
          prompt: stepPrompt(instruction, context),
          temperature: run.agent?.temp ?? 0.7,
          maxTokens: MAX_OUTPUT_TOKENS,
          signal: timeout.signal,
        },
        apiKey,
      );

      const stepCost = costOfCall(run.model, result.tokensIn, result.tokensOut);
      tokensIn += result.tokensIn;
      tokensOut += result.tokensOut;
      costCents += stepCost;
      context = result.text;

      const finished = await prisma.runStep.update({
        where: { id: step.id },
        data: {
          status: 'SUCCEEDED',
          output: result.text,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costCents: stepCost,
          finishedAt: new Date(),
        },
      });
      publish({ type: 'step.finished', runId, index: step.index, step: toRunStepDto(finished) });
    } catch (error) {
      const aborted = signal.aborted;
      const message = aborted
        ? 'Execução cancelada.'
        : timeout.signal.aborted
          ? 'O passo excedeu o tempo limite.'
          : error instanceof Error
            ? error.message
            : 'Falha desconhecida.';

      const finished = await prisma.runStep.update({
        where: { id: step.id },
        data: {
          status: aborted ? 'SKIPPED' : 'FAILED',
          error: message,
          finishedAt: new Date(),
        },
      });
      publish({ type: 'step.finished', runId, index: step.index, step: toRunStepDto(finished) });

      if (aborted) canceled = true;
      else failure = message;
      break;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  }

  // Anything still pending never ran.
  await prisma.runStep.updateMany({
    where: { runId, status: 'PENDING' },
    data: { status: 'SKIPPED', finishedAt: new Date() },
  });

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: canceled ? 'CANCELED' : failure ? 'FAILED' : 'SUCCEEDED',
      error: failure,
      tokensIn,
      tokensOut,
      costCents,
      finishedAt: new Date(),
    },
  });

  const finished = await prisma.run.findUnique({ where: { id: runId }, include: runInclude });
  if (finished) publish({ type: 'run.finished', runId, run: toRunDto(finished) });
};
