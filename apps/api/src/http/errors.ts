import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { isProd } from '../env.js';

/**
 * Errors that are safe to show the user. `message` is pt-PT copy the web app
 * renders straight into a toast.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'bad_request') =>
  new AppError(400, code, message);

export const unauthorized = (message = 'Sessão expirada. Inicie sessão novamente.') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'Não tem permissão para esta ação.') =>
  new AppError(403, 'forbidden', message);

export const notFound = (message = 'Registo não encontrado.') =>
  new AppError(404, 'not_found', message);

export const conflict = (message: string, code = 'conflict') => new AppError(409, code, message);

export const unprocessable = (message: string, code = 'unprocessable') =>
  new AppError(422, code, message);

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    void reply.status(404).send({ error: { code: 'not_found', message: 'Endpoint inexistente.' } });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      void reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      const first = error.issues[0];
      void reply.status(422).send({
        error: {
          code: 'validation_failed',
          message: first ? `${first.path.join('.')}: ${first.message}` : 'Pedido inválido.',
          issues: error.issues,
        },
      });
      return;
    }

    // Fastify's own errors (body parsing, rate limit) carry a usable status.
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (status >= 500) request.log.error({ err: error }, 'unhandled error');

    void reply.status(status).send({
      error: {
        code: error.code ?? 'internal_error',
        message:
          status >= 500 && isProd
            ? 'Erro interno. Tente novamente.'
            : (error.message ?? 'Erro interno.'),
      },
    });
  });
};
