import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db, Collection } from 'mongodb';
import { MongoDBBookingRepository } from './mongodb-booking.repository';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';

describe('MongoDBBookingRepository', () => {
  let client: MongoClient;
  let db: Db;
  let repository: MongoDBBookingRepository;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wokibrain_test';

  beforeEach(async () => {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('wokibrain_test');
    repository = new MongoDBBookingRepository(
      db.collection('bookings'),
      db.collection('idempotency')
    );

    await db.collection('bookings').deleteMany({});
    await db.collection('idempotency').deleteMany({});
  });

  afterEach(async () => {
    try {
      if (client) {
        await client.close(true);
      }
    } catch (error) {
      // Ignore errors when closing client (may already be closed)
    }
  });

  describe('save and findById', () => {
    it('should save and retrieve booking', async () => {
      const interval = TimeInterval.create(
        new Date('2025-10-22T20:00:00'),
        new Date('2025-10-22T21:30:00')
      );
      const duration = Duration.create(90);
      const booking = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval,
        duration,
        BookingStatus.CONFIRMED
      );

      await repository.save(booking);

      const found = await repository.findById('B1');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('B1');
      expect(found?.restaurantId).toBe('R1');
      expect(found?.partySize).toBe(4);
    });

    it('should return null for non-existent booking', async () => {
      const found = await repository.findById('NONEXISTENT');
      expect(found).toBeNull();
    });
  });

  describe('findBySectorAndDate', () => {
    it('should find bookings for sector and date', async () => {
      // Use a date in the future to avoid timezone issues
      // The repository filters by date range, so we need to ensure the booking intervals
      // fall within the start and end of day for the given date
      const date = new Date('2025-12-25T12:00:00Z');
      const interval1 = TimeInterval.create(
        new Date('2025-12-25T20:00:00Z'),
        new Date('2025-12-25T21:30:00Z')
      );
      const interval2 = TimeInterval.create(
        new Date('2025-12-25T21:00:00Z'),
        new Date('2025-12-25T22:30:00Z')
      );

      const booking1 = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval1,
        Duration.create(90),
        BookingStatus.CONFIRMED
      );

      const booking2 = Booking.create(
        'B2',
        'R1',
        'S1',
        ['T2'],
        2,
        interval2,
        Duration.create(90),
        BookingStatus.CONFIRMED
      );

      await repository.save(booking1);
      await repository.save(booking2);

      // The repository uses local timezone for date filtering
      // We'll use the same date but adjust for timezone
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const bookings = await repository.findBySectorAndDate('S1', localDate);

      // The query filters by date range, so bookings should be found
      expect(bookings.length).toBeGreaterThanOrEqual(2);
      const bookingIds = bookings.map((b) => b.id);
      expect(bookingIds).toContain('B1');
      expect(bookingIds).toContain('B2');
    });

    it('should not return cancelled bookings', async () => {
      const date = new Date('2025-10-22');
      const interval = TimeInterval.create(
        new Date('2025-10-22T20:00:00'),
        new Date('2025-10-22T21:30:00')
      );

      const booking = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval,
        Duration.create(90),
        BookingStatus.CANCELLED
      );

      await repository.save(booking);

      const bookings = await repository.findBySectorAndDate('S1', date);
      expect(bookings.find((b) => b.id === 'B1')).toBeUndefined();
    });
  });

  describe('findByTableAndDateRange', () => {
    it('should find bookings for table in date range', async () => {
      const start = new Date('2025-10-22T20:00:00');
      const end = new Date('2025-10-22T23:00:00');
      const interval = TimeInterval.create(
        new Date('2025-10-22T20:30:00'),
        new Date('2025-10-22T21:15:00')
      );

      const booking = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval,
        Duration.create(45),
        BookingStatus.CONFIRMED
      );

      await repository.save(booking);

      const bookings = await repository.findByTableAndDateRange('T1', start, end);
      expect(bookings.length).toBeGreaterThanOrEqual(1);
      expect(bookings[0].id).toBe('B1');
    });
  });

  describe('idempotency', () => {
    it('should save and retrieve by idempotency key', async () => {
      const interval = TimeInterval.create(
        new Date('2025-10-22T20:00:00'),
        new Date('2025-10-22T21:30:00')
      );
      const booking = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval,
        Duration.create(90),
        BookingStatus.CONFIRMED
      );

      await repository.saveWithIdempotencyKey(booking, 'idempotency-key-123');

      const found = await repository.findByIdempotencyKey('idempotency-key-123');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('B1');
    });

    it('should return null for non-existent idempotency key', async () => {
      const found = await repository.findByIdempotencyKey('non-existent-key');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete booking', async () => {
      const interval = TimeInterval.create(
        new Date('2025-10-22T20:00:00'),
        new Date('2025-10-22T21:30:00')
      );
      const booking = Booking.create(
        'B1',
        'R1',
        'S1',
        ['T1'],
        4,
        interval,
        Duration.create(90),
        BookingStatus.CONFIRMED
      );

      await repository.save(booking);
      await repository.delete('B1');

      const found = await repository.findById('B1');
      expect(found).toBeNull();
    });
  });
});
