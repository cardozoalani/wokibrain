import { Db } from 'mongodb';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export async function up(db: Db): Promise<void> {
  await db.collection('restaurants').createIndex({ id: 1 }, { unique: true });
  await db.collection('restaurants').createIndex({ name: 1 });

  await db.collection('sectors').createIndex({ id: 1 }, { unique: true });
  await db.collection('sectors').createIndex({ restaurantId: 1 });

  await db.collection('tables').createIndex({ id: 1 }, { unique: true });
  await db.collection('tables').createIndex({ sectorId: 1 });
  await db.collection('tables').createIndex({ sectorId: 1, name: 1 });

  await db.collection('bookings').createIndex({ id: 1 }, { unique: true });
  await db
    .collection('bookings')
    .createIndex({ sectorId: 1, 'interval.start': 1, 'interval.end': 1 });
  await db
    .collection('bookings')
    .createIndex({ tableIds: 1, 'interval.start': 1, 'interval.end': 1 });
  await db.collection('bookings').createIndex({ status: 1 });
  await db.collection('bookings').createIndex({ guestEmail: 1 });

  await db
    .collection('idempotency')
    .createIndex({ key: 1 }, { unique: true, expireAfterSeconds: 86400 });

  await db
    .collection('events')
    .createIndex({ aggregateId: 1, aggregateType: 1, version: 1 }, { unique: true });
  await db.collection('events').createIndex({ aggregateId: 1, version: 1 });
  await db.collection('events').createIndex({ aggregateType: 1, occurredAt: 1 });
  await db.collection('events').createIndex({ eventType: 1 });

  await db
    .collection('snapshots')
    .createIndex({ aggregateId: 1, aggregateType: 1, version: -1 }, { unique: true });

  await db.collection('bookings_read').createIndex({ id: 1 }, { unique: true });
  await db.collection('bookings_read').createIndex({ restaurantId: 1, sectorId: 1, start: 1 });
  await db.collection('bookings_read').createIndex({ status: 1 });
  await db.collection('bookings_read').createIndex({ guestEmail: 1 });

  logger.info('Migration 001: Indexes created');
}

export async function down(db: Db): Promise<void> {
  await db.collection('restaurants').dropIndexes();
  await db.collection('sectors').dropIndexes();
  await db.collection('tables').dropIndexes();
  await db.collection('bookings').dropIndexes();
  await db.collection('idempotency').dropIndexes();
  await db.collection('events').dropIndexes();
  await db.collection('snapshots').dropIndexes();
  await db.collection('bookings_read').dropIndexes();

  logger.info('Migration 001: Indexes dropped');
}
