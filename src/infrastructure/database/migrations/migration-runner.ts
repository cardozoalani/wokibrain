import { Db } from 'mongodb';
import { readdirSync } from 'fs';
import { join } from 'path';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

interface Migration {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

interface MigrationRecord {
  version: number;
  name: string;
  appliedAt: Date;
}

export class MigrationRunner {
  constructor(private db: Db) {}

  async runMigrations(): Promise<void> {
    const migrationsCollection = this.db.collection<MigrationRecord>('migrations');

    await migrationsCollection.createIndex({ version: 1 }, { unique: true });

    const migrations = await this.loadMigrations();
    const appliedVersions = await this.getAppliedVersions();

    const pendingMigrations = migrations.filter((m) => !appliedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info({ count: pendingMigrations.length }, 'Running migrations');

    for (const migration of pendingMigrations) {
      logger.info({ version: migration.version, name: migration.name }, 'Running migration');

      await migration.up(this.db);

      await migrationsCollection.insertOne({
        version: migration.version,
        name: migration.name,
        appliedAt: new Date(),
      });

      logger.info({ version: migration.version }, 'Migration applied');
    }

    logger.info('All migrations completed');
  }

  async rollbackLastMigration(): Promise<void> {
    const migrationsCollection = this.db.collection<MigrationRecord>('migrations');

    const lastMigration = await migrationsCollection
      .find()
      .sort({ version: -1 })
      .limit(1)
      .toArray();

    if (lastMigration.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const record = lastMigration[0];
    const migrations = await this.loadMigrations();
    const migration = migrations.find((m) => m.version === record.version);

    if (!migration) {
      throw new Error(`Migration ${record.version} not found`);
    }

    logger.info({ version: migration.version, name: migration.name }, 'Rolling back migration');

    await migration.down(this.db);
    await migrationsCollection.deleteOne({ version: migration.version });

    logger.info({ version: migration.version }, 'Migration rolled back');
  }

  private async loadMigrations(): Promise<Migration[]> {
    const migrationsDir = __dirname;
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.ts') && f !== 'migration-runner.ts')
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.ts$/);
      if (!match) continue;

      const version = parseInt(match[1], 10);
      const name = match[2];

      const module = await import(join(migrationsDir, file));

      migrations.push({
        version,
        name,
        up: module.up,
        down: module.down,
      });
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  private async getAppliedVersions(): Promise<number[]> {
    const migrationsCollection = this.db.collection<MigrationRecord>('migrations');
    const records = await migrationsCollection.find().toArray();
    return records.map((r) => r.version);
  }
}
