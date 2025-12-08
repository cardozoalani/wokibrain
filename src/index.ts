import { validateEnv } from './infrastructure/config/env';
import { FastifyServer } from './presentation/http/server';
import { seedDatabase } from './infrastructure/database/seed';
import { MongoDBClient } from './infrastructure/database/mongodb.client';

async function bootstrap(): Promise<void> {
  const config = validateEnv();
  const server = new FastifyServer(config);

  const handleShutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, gracefully shutting down...`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  await server.initialize();

  if (process.env.SEED_DB === 'true') {
    console.log('Seeding database...');
    const dbClient = new MongoDBClient(config);
    await dbClient.connect();
    await seedDatabase(dbClient);
    await dbClient.disconnect();
    console.log('Database seeded successfully');
  }

  await server.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});



