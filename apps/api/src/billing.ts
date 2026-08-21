import { prisma } from './db.js';

/** First instant of the current calendar month, UTC. */
export const monthStart = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export interface AgentUsage {
  /** Lifetime runs that reached a terminal state. */
  runCount: number;
  /** Spend so far this calendar month, in cents. */
  spentCents: number;
  /** Runs started this calendar month, for the per-agent run ceiling. */
  runsThisMonth: number;
}

const EMPTY: AgentUsage = { runCount: 0, spentCents: 0, runsThisMonth: 0 };

export const agentUsage = async (): Promise<Map<number, AgentUsage>> => {
  const since = monthStart();

  const [lifetime, thisMonth] = await Promise.all([
    prisma.run.groupBy({
      by: ['agentId'],
      where: { agentId: { not: null }, status: { in: ['SUCCEEDED', 'FAILED'] } },
      _count: { _all: true },
    }),
    prisma.run.groupBy({
      by: ['agentId'],
      where: { agentId: { not: null }, createdAt: { gte: since } },
      _sum: { costCents: true },
      _count: { _all: true },
    }),
  ]);

  const usage = new Map<number, AgentUsage>();
  const upsert = (id: number, patch: Partial<AgentUsage>) => {
    usage.set(id, { ...EMPTY, ...usage.get(id), ...patch });
  };

  for (const row of lifetime) {
    if (row.agentId !== null) upsert(row.agentId, { runCount: row._count._all });
  }
  for (const row of thisMonth) {
    if (row.agentId !== null) {
      upsert(row.agentId, {
        spentCents: row._sum.costCents ?? 0,
        runsThisMonth: row._count._all,
      });
    }
  }

  return usage;
};

export const usageOf = (usage: Map<number, AgentUsage>, agentId: number): AgentUsage =>
  usage.get(agentId) ?? EMPTY;

/** Platform-wide spend this calendar month, in cents. */
export const platformSpendCents = async (): Promise<number> => {
  const result = await prisma.run.aggregate({
    where: { createdAt: { gte: monthStart() } },
    _sum: { costCents: true },
  });
  return result._sum.costCents ?? 0;
};
