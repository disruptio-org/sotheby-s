import {
  claimPasswordSchema,
  claimTokenSchema,
  passwordResetRequestSchema,
  type ClaimPeekDto,
} from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../crypto.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { issueSession } from '../http/auth.js';
import { AppError } from '../http/errors.js';
import {
  claimReset,
  issueReset,
  recentResetCount,
  resolveReset,
  type ResetRefusal,
} from '../passwordResets.js';
import { sessionPayload } from './auth.js';

const refuse = (reason: ResetRefusal): AppError => {
  switch (reason) {
    case 'expired':
      return new AppError(
        410,
        'reset_expired',
        'Esta ligação expirou. Peça uma nova a partir do início de sessão.',
      );
    case 'used':
      return new AppError(
        410,
        'reset_used',
        'Esta ligação já foi utilizada. Inicie sessão com a palavra-passe que definiu.',
      );
    default:
      return new AppError(
        410,
        'reset_invalid',
        'Esta ligação já não é válida. Peça uma nova a partir do início de sessão.',
      );
  }
};

/**
 * The whole flow is public, and every one of its answers is written so that a
 * stranger learns nothing about who holds an account here.
 */
export const passwordResetRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/auth/password-reset',
    {
      // Per source address. This one may answer 429, because a limit on where a
      // request came from says nothing about which addresses have accounts.
      config: { rateLimit: { max: env.RESET_MAX_PER_IP, timeWindow: '1 hour' } },
    },
    async (request) => {
      const { email } = passwordResetRequestSchema.parse(request.body);

      const user = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' } },
        select: { id: true, status: true },
      });

      // Everything below is silent by design: a suspended account, an address
      // nobody holds and an account that has asked too often are all answered
      // exactly alike, because any difference at all is an enumeration oracle.
      if (user && user.status !== 'SUSPENDED') {
        const asked = await recentResetCount(user.id);
        if (asked < env.RESET_MAX_PER_ACCOUNT) {
          // Not awaited: sending takes as long as the mail server takes, and a
          // reply that is slower for real accounts is the same disclosure by
          // another route. The transport never throws.
          void issueReset(user.id).catch((error: unknown) => {
            request.log.error({ err: error }, 'password reset could not be issued');
          });
        }
      }

      // The one answer this route has.
      return { ok: true as const };
    },
  );

  app.post(
    '/auth/password-reset/lookup',
    { config: { rateLimit: { max: 20, timeWindow: '5 minutes' } } },
    async (request) => {
      const { token } = claimTokenSchema.parse(request.body);

      const found = await resolveReset(token);
      if (!found.ok) throw refuse(found.reason);

      // No profile here: a reset says nothing about what the account can do.
      return { name: found.reset.name, roleName: null } satisfies ClaimPeekDto;
    },
  );

  app.post(
    '/auth/password-reset/redeem',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const { token, password } = claimPasswordSchema.parse(request.body);

      const found = await resolveReset(token);
      if (!found.ok) throw refuse(found.reason);

      // Hashing first keeps the expensive, side-effect-free work outside the
      // claim, so a slow hash cannot widen the window two clicks race in.
      const passwordHash = await hashPassword(password);

      if (!(await claimReset(found.reset.id))) throw refuse('used');

      // Whoever asked for this may be recovering from someone else having the
      // password, so every session that account had open ends here. An invited
      // account that never had a password becomes active by the same act.
      await prisma.$transaction([
        prisma.user.update({
          where: { id: found.reset.userId },
          data: { passwordHash, status: 'ACTIVE', lastLoginAt: new Date() },
        }),
        prisma.session.deleteMany({ where: { userId: found.reset.userId } }),
        // Any other link this account asked for dies with the one just used.
        // Recovery is over; an unopened message must not still be a way in.
        prisma.passwordReset.updateMany({
          where: { userId: found.reset.userId, usedAt: null },
          data: { usedAt: new Date() },
        }),
        // An outstanding invitation is spent by this too — the account it led
        // to now has a password its owner chose.
        prisma.invitation.deleteMany({ where: { userId: found.reset.userId } }),
      ]);

      await issueSession(reply, found.reset.userId, request.headers['user-agent']);
      return sessionPayload(found.reset.userId);
    },
  );
};
