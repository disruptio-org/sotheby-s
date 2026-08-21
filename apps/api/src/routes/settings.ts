import {
  MODEL_BY_ID,
  providerKeySchema,
  settingsUpdateSchema,
  type ProviderId,
  type SettingsDto,
} from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { platformSpendCents } from '../billing.js';
import { prisma } from '../db.js';
import { requirePerm } from '../http/auth.js';
import { badRequest, unprocessable } from '../http/errors.js';
import { providerFor } from '../runner/providers.js';
import { keyFor, keyStatus, loadSettings, setKey } from '../settings-service.js';

const dto = async (): Promise<SettingsDto> => {
  const [row, keyConfigured, spentCents] = await Promise.all([
    loadSettings(),
    keyStatus(),
    platformSpendCents(),
  ]);

  return {
    provider: row.provider as ProviderId,
    model: row.model,
    keyConfigured,
    budgetCents: row.budgetCents,
    alertPct: row.alertPct,
    hardStop: row.hardStop,
    spentCents,
  };
};

export const settingsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/settings', { preHandler: requirePerm('settings.view') }, dto);

  app.patch('/settings', { preHandler: requirePerm('settings.edit') }, async (request) => {
    const input = settingsUpdateSchema.parse(request.body);
    const current = await loadSettings();

    // Switching provider without naming a model moves to that provider's first.
    const provider = (input.provider ?? current.provider) as ProviderId;
    let model = input.model ?? current.model;
    if (input.provider !== undefined && input.model === undefined) {
      const spec = MODEL_BY_ID[current.model];
      if (!spec || spec.provider !== provider) {
        const fallback = Object.values(MODEL_BY_ID).find((m) => m.provider === provider);
        if (!fallback) throw unprocessable('Fornecedor sem modelos disponíveis.');
        model = fallback.id;
      }
    }

    const spec = MODEL_BY_ID[model];
    if (!spec) throw unprocessable('Modelo desconhecido.');
    if (spec.provider !== provider) {
      throw unprocessable('O modelo predefinido não pertence ao fornecedor selecionado.');
    }

    await prisma.settings.update({
      where: { id: 1 },
      data: {
        provider,
        model,
        ...(input.budgetCents !== undefined ? { budgetCents: input.budgetCents } : {}),
        ...(input.alertPct !== undefined ? { alertPct: input.alertPct } : {}),
        ...(input.hardStop !== undefined ? { hardStop: input.hardStop } : {}),
      },
    });

    return dto();
  });

  app.put('/settings/key', { preHandler: requirePerm('settings.edit') }, async (request) => {
    const input = providerKeySchema.parse(request.body);
    await setKey(input.provider as ProviderId, input.key);
    return dto();
  });

  app.post(
    '/settings/key/test',
    {
      preHandler: requirePerm('settings.edit'),
      config: { rateLimit: { max: 20, timeWindow: '5 minutes' } },
    },
    async (request) => {
      const { provider } = providerKeySchema.pick({ provider: true }).parse(request.body);
      const key = await keyFor(provider as ProviderId);
      if (!key) throw badRequest('Não há chave configurada para este fornecedor.');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const ok = await providerFor(provider as ProviderId).verifyKey(key, controller.signal);
        return { ok };
      } catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : 'Falha na ligação.' };
      } finally {
        clearTimeout(timer);
      }
    },
  );
};
