import { FastifyPluginAsync } from 'fastify';
import { MongoDBClient } from '@infrastructure/database/mongodb.client';

interface HealthRoutesOptions {
  dbClient: MongoDBClient;
  version: string;
}

const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (fastify, opts) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      version: opts.version,
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await opts.dbClient.getDb().admin().ping();
      return reply.code(200).send({
        status: 'ready',
        checks: {
          database: 'ok',
        },
      });
    } catch (error) {
      return reply.code(503).send({
        status: 'not_ready',
        checks: {
          database: 'failed',
        },
      });
    }
  });

  fastify.get('/health/live', async (_request, reply) => {
    return reply.code(200).send({
      status: 'alive',
    });
  });
};

export default healthRoutes;
