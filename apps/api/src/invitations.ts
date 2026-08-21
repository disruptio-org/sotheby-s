import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db.js';
import { env } from './env.js';
import { invitationMail } from './mail/invitation.js';
import { sendMail } from './mail/transport.js';

/** 256 bits from the platform CSPRNG, URL-safe so it survives an e-mail client. */
const newToken = (): string => randomBytes(32).toString('base64url');

const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

export interface IssuedInvitation {
  expiresAt: Date;
  delivered: boolean;
  /** The transport's complaint, for the administrator to act on. */
  detail: string | null;
}

/**
 * Issues a fresh invitation and mails it. Every earlier invitation for the
 * account is deleted first, which is what makes a link already sitting in
 * somebody's inbox stop working.
 *
 * The raw token exists in this function and in the message it produces. It is
 * never stored, never returned to a caller and never logged.
 */
export const issueInvitation = async (userId: number): Promise<IssuedInvitation> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: { select: { name: true } } },
  });

  const token = newToken();
  const expiresAt = new Date(Date.now() + env.INVITE_TTL_HOURS * 3600_000);

  const [, invitation] = await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { userId } }),
    prisma.invitation.create({ data: { userId, tokenHash: hashToken(token), expiresAt } }),
  ]);

  const result = await sendMail(
    invitationMail({
      name: user.name,
      email: user.email,
      roleName: user.role.name,
      url: `${env.WEB_ORIGIN}/?convite=${token}`,
      ttlHours: env.INVITE_TTL_HOURS,
    }),
  );

  if (result.delivered) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { sentAt: new Date() },
    });
  }

  return {
    expiresAt,
    delivered: result.delivered,
    detail: result.delivered ? null : result.detail,
  };
};

export type InvitationRefusal = 'invalid' | 'expired' | 'used';

export interface ResolvedInvitation {
  id: number;
  userId: number;
  name: string;
  roleName: string;
}

export type InvitationLookup =
  | { ok: true; invitation: ResolvedInvitation }
  | { ok: false; reason: InvitationRefusal };

/**
 * A superseded link and an unknown one are both `invalid`: the platform has no
 * way to tell them apart, and nothing useful would come of trying.
 */
export const resolveInvitation = async (token: string): Promise<InvitationLookup> => {
  const digest = hashToken(token);

  const row = await prisma.invitation.findUnique({
    where: { tokenHash: digest },
    include: { user: { include: { role: { select: { name: true } } } } },
  });

  // The lookup is by digest, so the secret is never the thing being compared.
  // The explicit check keeps that property honest if the query ever changes —
  // both operands are a SHA-256, so the lengths always match.
  if (!row || !timingSafeEqual(Buffer.from(row.tokenHash, 'hex'), Buffer.from(digest, 'hex'))) {
    return { ok: false, reason: 'invalid' };
  }
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  // Suspending an account has to stop a link already in somebody's inbox, or
  // the invitation becomes a way back in. The refusal says no more than that
  // the link is no good; the state of the account is not the invitee's business.
  if (row.user.status === 'SUSPENDED') return { ok: false, reason: 'invalid' };

  return {
    ok: true,
    invitation: {
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      roleName: row.user.role.name,
    },
  };
};

/**
 * Claims the invitation before doing anything else. The conditional update is
 * the whole of the concurrency story: two simultaneous redemptions of the same
 * link both try to move `usedAt` off null, exactly one succeeds, and the loser
 * is told the link has been used.
 */
export const claimInvitation = async (invitationId: number): Promise<boolean> => {
  const claimed = await prisma.invitation.updateMany({
    where: { id: invitationId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1;
};
