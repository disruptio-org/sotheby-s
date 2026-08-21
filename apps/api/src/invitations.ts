import { prisma } from './db.js';
import { env } from './env.js';
import { invitationMail } from './mail/invitation.js';
import { sendMail } from './mail/transport.js';
import { hashToken, newToken, sameDigest } from './tokens.js';

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

  if (!row || !sameDigest(row.tokenHash, digest)) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  // An account that has left the invited state has no business being claimed by
  // a link: it was suspended, or its owner already set a password some other
  // way. The refusal says no more than that the link is no good — the state of
  // the account is not the link holder's business.
  if (row.user.status !== 'INVITED') return { ok: false, reason: 'invalid' };

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
