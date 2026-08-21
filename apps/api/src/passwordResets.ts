import { prisma } from './db.js';
import { env } from './env.js';
import { passwordResetMail } from './mail/passwordReset.js';
import { sendMail } from './mail/transport.js';
import { hashToken, newToken, sameDigest } from './tokens.js';

const HOUR_MS = 3_600_000;

/**
 * Issues a reset and mails it. Earlier links are left alone: they are already
 * single-use and short-lived, and keeping the rows is what lets the throttle
 * count requests without the count depending on which addresses exist.
 *
 * The caller is told nothing. Whether the message was delivered, whether the
 * account exists at all — none of it may reach the person who asked, so there
 * is nothing useful to return.
 */
export const issueReset = async (userId: number): Promise<void> => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const token = newToken();
  const expiresAt = new Date(Date.now() + env.RESET_TTL_MINUTES * 60_000);

  await prisma.passwordReset.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  await sendMail(
    passwordResetMail({
      name: user.name,
      email: user.email,
      url: `${env.WEB_ORIGIN}/?recuperar=${token}`,
      ttlMinutes: env.RESET_TTL_MINUTES,
    }),
  );
};

/** How many resets this account has asked for in the last hour. */
export const recentResetCount = async (userId: number): Promise<number> =>
  prisma.passwordReset.count({
    where: { userId, createdAt: { gt: new Date(Date.now() - HOUR_MS) } },
  });

export type ResetRefusal = 'invalid' | 'expired' | 'used';

export interface ResolvedReset {
  id: number;
  userId: number;
  name: string;
}

export type ResetLookup =
  | { ok: true; reset: ResolvedReset }
  | { ok: false; reason: ResetRefusal };

export const resolveReset = async (token: string): Promise<ResetLookup> => {
  const digest = hashToken(token);

  const row = await prisma.passwordReset.findUnique({
    where: { tokenHash: digest },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  if (!row || !sameDigest(row.tokenHash, digest)) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  // Suspending an account has to stop a link already sitting in an inbox, or
  // recovery becomes a way around the suspension.
  if (row.user.status === 'SUSPENDED') return { ok: false, reason: 'invalid' };

  return { ok: true, reset: { id: row.id, userId: row.userId, name: row.user.name } };
};

/**
 * Claims the reset before anything else changes. Two simultaneous redemptions
 * of the same link both try to move `usedAt` off null; exactly one succeeds.
 */
export const claimReset = async (resetId: number): Promise<boolean> => {
  const claimed = await prisma.passwordReset.updateMany({
    where: { id: resetId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1;
};
