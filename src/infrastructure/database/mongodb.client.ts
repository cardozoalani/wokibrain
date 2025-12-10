import { MongoClient, Db } from 'mongodb';
import { readFileSync } from 'fs';
import pino from 'pino';
import { Env } from '../config/env';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export class MongoDBClient {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(private config: Env) {}

  async connect(): Promise<void> {
    const options: any = {
      maxPoolSize: this.config.MONGODB_MAX_POOL_SIZE,
      minPoolSize: this.config.MONGODB_MIN_POOL_SIZE,
      retryWrites: true,
      w: 'majority',
    };

    // Configure TLS for DocumentDB (AWS) - only enable for non-local MongoDB
    // Detect if we're connecting to DocumentDB or a remote MongoDB that requires TLS
    const isLocalMongoDB =
      this.config.MONGODB_URI.includes('localhost') ||
      this.config.MONGODB_URI.includes('127.0.0.1') ||
      this.config.MONGODB_URI.includes('mongodb:') ||
      this.config.NODE_ENV === 'development';

    if (!isLocalMongoDB) {
      // Configure TLS for DocumentDB
      // Note: For DocumentDB, we need TLS enabled but can allow invalid certificates
      // if the CA file is not properly configured. This is a temporary workaround.
      options.tls = true;
      options.tlsAllowInvalidCertificates = true;
      options.tlsAllowInvalidHostnames = true;

      // DocumentDB only supports SCRAM-SHA-1, not SCRAM-SHA-256
      // We need to explicitly set the auth mechanism
      options.authMechanism = 'SCRAM-SHA-1';
    }

    // Try to use CA file if provided, but don't fail if it's not available
    if (this.config.MONGODB_TLS_CA_FILE) {
      try {
        const ca = readFileSync(this.config.MONGODB_TLS_CA_FILE);
        options.tlsCAFile = this.config.MONGODB_TLS_CA_FILE;
        options.ca = [ca];
        // If CA file is successfully loaded, we can validate certificates
        options.tlsAllowInvalidCertificates = false;
        options.tlsAllowInvalidHostnames = false;
        logger.info({ caFile: this.config.MONGODB_TLS_CA_FILE }, 'TLS configured with CA file');
      } catch (error) {
        logger.warn(
          { error, caFile: this.config.MONGODB_TLS_CA_FILE },
          'Could not read TLS CA file, using invalid certificate mode'
        );
        // Continue with invalid certificates allowed
      }
    } else {
      logger.warn(
        'MONGODB_TLS_CA_FILE not set, allowing invalid certificates (not recommended for production)'
      );
    }

    this.client = new MongoClient(this.config.MONGODB_URI, options);

    await this.client.connect();
    this.db = this.client.db(this.config.MONGODB_DATABASE);

    await this.createIndexes();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    await this.db.collection('restaurants').createIndex({ id: 1 }, { unique: true });

    await this.db.collection('sectors').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('sectors').createIndex({ restaurantId: 1 });

    await this.db.collection('tables').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('tables').createIndex({ sectorId: 1 });

    await this.db.collection('bookings').createIndex({ id: 1 }, { unique: true });
    await this.db
      .collection('bookings')
      .createIndex({ sectorId: 1, 'interval.start': 1, 'interval.end': 1 });
    await this.db
      .collection('bookings')
      .createIndex({ tableIds: 1, 'interval.start': 1, 'interval.end': 1 });
    await this.db.collection('bookings').createIndex({ status: 1 });

    await this.db
      .collection('idempotency')
      .createIndex({ key: 1 }, { unique: true, expireAfterSeconds: 86400 });
  }
}
