import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { env, isProd } from './env.js';
import { registerAuth } from './http/auth.js';
import { registerErrorHandler } from './http/errors.js';
import { agentRoutes } from './routes/agents.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { invitationRoutes } from './routes/invitations.js';
import { passwordResetRoutes } from './routes/passwordResets.js';
import { roleRoutes } from './routes/roles.js';
import { runRoutes } from './routes/runs.js';
import { settingsRoutes } from './routes/settings.js';
import { skillRoutes } from './routes/skills.js';
import { userRoutes } from './routes/users.js';
import { workflowRoutes } from './routes/workflows.js';

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: isProd
      ? { level: 'info' }
      : { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } },
    trustProxy: isProd,
    bodyLimit: 1_048_576,
  });

  await app.register(helmet, {
    // The API serves JSON only; the web app carries its own CSP.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  await app.register(cookie, { secret: env.SESSION_SECRET });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // SSE connections are long-lived by design; counting them would starve a
    // user watching several runs.
    allowList: (request) => request.url.endsWith('/events'),
  });

  registerErrorHandler(app);
  registerAuth(app);

  app.get('/api/health', async () => ({ ok: true, env: env.NODE_ENV }));

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(invitationRoutes);
      await api.register(passwordResetRoutes);
      await api.register(catalogRoutes);
      await api.register(agentRoutes);
      await api.register(skillRoutes);
      await api.register(workflowRoutes);
      await api.register(runRoutes);
      await api.register(userRoutes);
      await api.register(roleRoutes);
      await api.register(settingsRoutes);
    },
    { prefix: '/api' },
  );

  return app;
};
