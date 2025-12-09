import { validateEnv } from './infrastructure/config/env';
import { FastifyServer } from './presentation/http/server';
import { seedDatabase } from './infrastructure/database/seed';
import { MongoDBClient } from './infrastructure/database/mongodb.client';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});

async function bootstrap(): Promise<void> {
  const config = validateEnv();
  const server = new FastifyServer(config);

  const handleShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, gracefully shutting down...`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ promise, reason }, 'Unhandled Rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    process.exit(1);
  });

  await server.initialize();

  if (process.env.SEED_DB === 'true') {
    logger.info('Seeding database...');
    const dbClient = new MongoDBClient(config);
    await dbClient.connect();
    await seedDatabase(dbClient);
    await dbClient.disconnect();
    logger.info('Database seeded successfully');
  }

  await server.start();
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start application');
  process.exit(1);
});
