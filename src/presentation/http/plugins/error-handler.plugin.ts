import { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { DomainError } from '@shared/errors';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        detail: 'Invalid input data',
        issues: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        detail: error.message,
      });
    }

    if ('statusCode' in error && error.statusCode) {
      return reply.status(error.statusCode).send({
        error: 'REQUEST_ERROR',
        detail: error.message,
      });
    }

    fastify.log.error(error);

    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      detail: 'An unexpected error occurred',
    });
  });
};

export default fp(errorHandlerPlugin);

