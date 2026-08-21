import { PROVIDER_IDS, type ProviderId } from '@sothebys/domain';
import { open, seal } from './crypto.js';
import { prisma } from './db.js';

export const loadSettings = async () => {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: 1 } });
};

/** Decrypted provider key, or null when none is on file. */
export const keyFor = async (provider: ProviderId): Promise<string | null> => {
  const row = await prisma.providerKey.findUnique({ where: { provider } });
  if (!row) return null;
  try {
    return open(row);
  } catch {
    // A key sealed with a retired ENCRYPTION_KEY is unreadable, not fatal:
    // treat it as absent so the operator can simply set it again.
    return null;
  }
};

export const setKey = async (provider: ProviderId, key: string): Promise<void> => {
  if (key.trim() === '') {
    await prisma.providerKey.deleteMany({ where: { provider } });
    return;
  }

  const sealed = seal(key);
  const hint = key.slice(-4);
  await prisma.providerKey.upsert({
    where: { provider },
    create: { provider, ...sealed, hint },
    update: { ...sealed, hint },
  });
};

/** Which providers have a key on file — the only key fact the client learns. */
export const keyStatus = async (): Promise<Record<ProviderId, boolean>> => {
  const rows = await prisma.providerKey.findMany({ select: { provider: true } });
  const present = new Set(rows.map((row) => row.provider));
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, present.has(id)])) as Record<
    ProviderId,
    boolean
  >;
};
