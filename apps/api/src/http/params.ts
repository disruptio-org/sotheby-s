import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const idOf = (request: FastifyRequest): number => idParams.parse(request.params).id;

const paging = z.object({
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.coerce.number().int().positive().optional(),
});

export const pagingOf = (request: FastifyRequest) => paging.parse(request.query);
