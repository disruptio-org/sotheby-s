import { MODELS } from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireAuth } from '../http/auth.js';

/** Reference data every screen needs: attachable resources and the model list. */
export const catalogRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/catalog', { preHandler: requireAuth }, async () => {
    const [knowledgeFiles, tools] = await Promise.all([
      prisma.knowledgeFile.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
      prisma.toolIntegration.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
      }),
    ]);

    return { knowledgeFiles, tools, models: MODELS };
  });
};
