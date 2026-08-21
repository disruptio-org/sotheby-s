import { prisma } from './db.js';
import { env } from './env.js';
import { setQueueErrorHandler } from './runner/queue.js';
import { buildServer } from './server.js';

const SESSION_SWEEP_MS = 60 * 60 * 1000;

/**
 * The queue lives in this process, so anything mid-flight when it stopped is
 * gone. Close those runs out rather than leaving them stuck as RUNNING.
 */
const reclaimOrphanedRuns = async (): Promise<number> => {
  const orphaned = await prisma.run.findMany({
    where: { status: { in: ['QUEUED', 'RUNNING'] } },
    select: { id: true },
  });
  if (orphaned.length === 0) return 0;

  const ids = orphaned.map((run) => run.id);
  await prisma.runStep.updateMany({
    where: { runId: { in: ids }, status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'SKIPPED', finishedAt: new Date() },
  });
  await prisma.run.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'FAILED',
      error: 'O servidor reiniciou durante a execução.',
      finishedAt: new Date(),
    },
  });
  return ids.length;
};

const main = async (): Promise<void> => {
  const app = await buildServer();

  setQueueErrorHandler((runId, error) => {
    app.log.error({ err: error, runId }, 'run failed outside the engine');
  });

  const reclaimed = await reclaimOrphanedRuns();
  if (reclaimed > 0) app.log.warn({ reclaimed }, 'closed out runs orphaned by a restart');

  const sweep = setInterval(() => {
    prisma.session
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch((error: unknown) => app.log.error({ err: error }, 'session sweep failed'));
  }, SESSION_SWEEP_MS);
  sweep.unref();

  await app.listen({ host: env.HOST, port: env.PORT });

  const shutdown = (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    clearInterval(sweep);
    void app
      .close()
      .then(() => prisma.$disconnect())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
