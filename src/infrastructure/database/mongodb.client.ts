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

    // Dynamically detect environment: DocumentDB (production) vs MongoDB (local)
    // DocumentDB detection: AWS DocumentDB endpoints contain .docdb. or .docdb-elastic.
    // Also check for DocumentDB-specific parameters in URI (tls=true, replicaSet=rs0)
    const isDocumentDB =
      this.config.MONGODB_URI.includes('.docdb.') ||
      this.config.MONGODB_URI.includes('.docdb-elastic.') ||
      (this.config.MONGODB_URI.includes('tls=true') &&
        this.config.MONGODB_URI.includes('replicaSet=rs0'));

    // Local MongoDB detection: localhost, 127.0.0.1, or Docker service name
    const isLocalMongoDB =
      this.config.MONGODB_URI.includes('localhost') ||
      this.config.MONGODB_URI.includes('127.0.0.1') ||
      this.config.MONGODB_URI.includes('mongodb:') || // Docker service name
      (this.config.NODE_ENV === 'development' && !isDocumentDB);

    if (isDocumentDB) {
      // DocumentDB (AWS) configuration
      logger.info('Detected DocumentDB connection, configuring TLS and SCRAM-SHA-1');
      options.tls = true;
      options.tlsAllowInvalidCertificates = true;
      options.tlsAllowInvalidHostnames = true;

      // DocumentDB only supports SCRAM-SHA-1, not SCRAM-SHA-256
      options.authMechanism = 'SCRAM-SHA-1';

      // DocumentDB-specific connection settings
      options.retryWrites = false; // DocumentDB doesn't support retryWrites
      options.readPreference = 'secondaryPreferred'; // Use read replicas when available
    } else if (isLocalMongoDB) {
      // Local MongoDB configuration (no TLS, standard auth)
      logger.info('Detected local MongoDB connection, using standard configuration');
      // No TLS, use default auth mechanism (SCRAM-SHA-256 for MongoDB 4.0+)
      options.retryWrites = true;
    } else {
      // Remote MongoDB (not DocumentDB) - may require TLS
      logger.info('Detected remote MongoDB connection');
      // Check if URI explicitly requests TLS
      if (this.config.MONGODB_URI.includes('tls=true')) {
        options.tls = true;
      }
    }

    // Try to use CA file if provided (only relevant for DocumentDB or TLS connections)
    if (this.config.MONGODB_TLS_CA_FILE && (isDocumentDB || options.tls)) {
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
    } else if (isDocumentDB && !this.config.MONGODB_TLS_CA_FILE) {
      // Only warn for DocumentDB if CA file is not set
      logger.warn(
        'MONGODB_TLS_CA_FILE not set for DocumentDB, allowing invalid certificates (not recommended for production)'
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
