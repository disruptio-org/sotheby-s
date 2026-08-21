import {
  invitationRedeemSchema,
  invitationTokenSchema,
  type InvitationPeekDto,
} from '@sothebys/domain';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../crypto.js';
import { prisma } from '../db.js';
import { issueSession } from '../http/auth.js';
import { AppError } from '../http/errors.js';
import { claimInvitation, resolveInvitation, type InvitationRefusal } from '../invitations.js';
import { sessionPayload } from './auth.js';

/**
 * Each refusal carries its own code so the page can say the right thing and,
 * where there is one, offer the way out.
 */
const refuse = (reason: InvitationRefusal): AppError => {
  switch (reason) {
    case 'expired':
      return new AppError(
        410,
        'invitation_expired',
        'Este convite expirou. Peça um novo a um administrador.',
      );
    case 'used':
      return new AppError(
        410,
        'invitation_used',
        'Este convite já foi utilizado. Inicie sessão com a palavra-passe que definiu.',
      );
    default:
      return new AppError(
        410,
        'invitation_invalid',
        'Esta ligação já não é válida. Peça um novo convite a um administrador.',
      );
  }
};

/**
 * Both routes are open — the whole point is that the invitee has no account to
 * sign in with yet. The token arrives in the body rather than the path, so it
 * never reaches an access log or a `Referer` header.
 */
export const invitationRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/invitations/lookup',
    { config: { rateLimit: { max: 20, timeWindow: '5 minutes' } } },
    async (request) => {
      const { token } = invitationTokenSchema.parse(request.body);

      const found = await resolveInvitation(token);
      if (!found.ok) throw refuse(found.reason);

      // The invitee's own name and the profile waiting for them. Nothing else:
      // a link in the wrong hands must not become a directory lookup.
      return {
        name: found.invitation.name,
        roleName: found.invitation.roleName,
      } satisfies InvitationPeekDto;
    },
  );

  app.post(
    '/invitations/redeem',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const { token, password } = invitationRedeemSchema.parse(request.body);

      const found = await resolveInvitation(token);
      if (!found.ok) throw refuse(found.reason);

      // Hashing first keeps the expensive, side-effect-free work outside the
      // claim, so a slow hash cannot widen the window two clicks race in.
      const passwordHash = await hashPassword(password);

      // Exactly one caller wins the claim; the other is told the link is spent.
      if (!(await claimInvitation(found.invitation.id))) throw refuse('used');

      await prisma.user.update({
        where: { id: found.invitation.userId },
        data: { passwordHash, status: 'ACTIVE', lastLoginAt: new Date() },
      });

      await issueSession(reply, found.invitation.userId, request.headers['user-agent']);
      return sessionPayload(found.invitation.userId);
    },
  );
};
