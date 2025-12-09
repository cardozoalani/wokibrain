import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { MongoDBBookingProjection } from './mongodb-booking-projection';
import { BookingCreatedEvent, BookingCancelledEvent } from '@domain/events/booking-events';
import { EventStore } from '../event-store/event-store.interface';

describe('MongoDBBookingProjection', () => {
  let client: MongoClient;
  let db: Db;
  let projection: MongoDBBookingProjection;
  let mockEventStore: EventStore;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wokibrain_test';

  beforeEach(async () => {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('wokibrain_test');

    mockEventStore = {
      replay: vi.fn(),
    } as any;

    projection = new MongoDBBookingProjection(db, mockEventStore);
    await db.collection('bookings_read').deleteMany({});
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

  describe('project', () => {
    it('should project BookingCreated event', async () => {
      const event = new BookingCreatedEvent(
        'B1',
        1,
        {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
        },
        { userId: 'U1' }
      );

      await projection.project(event);

      const readModel = await projection.get('B1');
      expect(readModel).not.toBeNull();
      expect(readModel?.id).toBe('B1');
      expect(readModel?.restaurantId).toBe('R1');
      expect(readModel?.partySize).toBe(4);
      expect(readModel?.status).toBe('CONFIRMED');
      expect(readModel?.guestName).toBe('John Doe');
    });

    it('should project BookingCancelled event', async () => {
      const createdEvent = new BookingCreatedEvent(
        'B1',
        1,
        {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
        },
        { userId: 'U1' }
      );

      await projection.project(createdEvent);

      const cancelledEvent = new BookingCancelledEvent('B1', 2, {
        reason: 'Cancelled by guest',
      });

      await projection.project(cancelledEvent);

      const readModel = await projection.get('B1');
      expect(readModel?.status).toBe('CANCELLED');
    });
  });

  describe('rebuild', () => {
    it('should rebuild projection from events', async () => {
      const event1 = new BookingCreatedEvent(
        'B1',
        1,
        {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
        },
        { userId: 'U1' }
      );

      let projectedEvents: any[] = [];
      (mockEventStore.replay as any).mockImplementation(
        async (_type: string, _version: number, handler: (event: any) => Promise<void>) => {
          await handler(event1);
          projectedEvents.push(event1);
        }
      );

      await projection.rebuild();

      expect(mockEventStore.replay).toHaveBeenCalled();
      const readModel = await projection.get('B1');
      expect(readModel).not.toBeNull();
    });
  });

  describe('list', () => {
    it('should list bookings with filters', async () => {
      const event1 = new BookingCreatedEvent(
        'B1',
        1,
        {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
        },
        { userId: 'U1' }
      );

      const event2 = new BookingCreatedEvent(
        'B2',
        1,
        {
          restaurantId: 'R1',
          sectorId: 'S2',
          tableIds: ['T2'],
          partySize: 2,
          start: new Date('2025-10-22T21:00:00'),
          end: new Date('2025-10-22T22:00:00'),
          durationMinutes: 60,
        },
        { userId: 'U1' }
      );

      await projection.project(event1);
      await projection.project(event2);

      const bookings = await projection.list({ sectorId: 'S1' });
      expect(bookings.length).toBe(1);
      expect(bookings[0].id).toBe('B1');
    });
  });
});

