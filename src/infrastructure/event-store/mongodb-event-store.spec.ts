import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { MongoDBEventStore } from './mongodb-event-store';
import { BookingCreatedEvent, BookingCancelledEvent } from '@domain/events/booking-events';

describe('MongoDBEventStore', () => {
  let client: MongoClient;
  let db: Db;
  let eventStore: MongoDBEventStore;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wokibrain_test';

  beforeEach(async () => {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('wokibrain_test');
    eventStore = new MongoDBEventStore(db);

    // Clean collections
    await db.collection('events').deleteMany({});
    await db.collection('snapshots').deleteMany({});
  });

  afterEach(async () => {
    try {
      if (client) {
        // Wait a bit for any pending operations to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Check if client is still connected before closing
        if (client.topology && client.topology.isConnected()) {
          await client.close();
        }
      }
    } catch (error: any) {
      // Ignore errors when closing client (may already be closed)
      // This can happen if tests run in parallel or if cleanup happens during async operations
      // These are expected and don't affect test results
      if (
        error?.name !== 'MongoClientClosedError' &&
        !error?.errmsg?.includes('client was closed')
      ) {
        // Only log unexpected errors
        console.warn('Unexpected error closing MongoDB client:', error?.message);
      }
    }
  });

  describe('appendEvents', () => {
    it('should append events successfully', async () => {
      const aggregateId = 'B1';
      const event1 = new BookingCreatedEvent(
        aggregateId,
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

      await eventStore.appendEvents(aggregateId, 'Booking', [event1], 0);

      const events = await eventStore.getEvents(aggregateId, 'Booking');
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('BookingCreated');
      expect(events[0].version).toBe(1);
    });

    it('should throw error on concurrency conflict', async () => {
      const aggregateId = 'B1';
      const event1 = new BookingCreatedEvent(aggregateId, 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T1'],
        partySize: 4,
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
        durationMinutes: 90,
      });

      await eventStore.appendEvents(aggregateId, 'Booking', [event1], 0);

      const event2 = new BookingCancelledEvent(aggregateId, 2, {
        reason: 'Cancelled by guest',
      });

      await expect(eventStore.appendEvents(aggregateId, 'Booking', [event2], 0)).rejects.toThrow(
        'Concurrency conflict'
      );
    });

    it('should append multiple events in order', async () => {
      const aggregateId = 'B1';
      const event1 = new BookingCreatedEvent(aggregateId, 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T1'],
        partySize: 4,
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
        durationMinutes: 90,
      });

      const event2 = new BookingCancelledEvent(aggregateId, 2, {
        reason: 'Cancelled',
      });

      await eventStore.appendEvents(aggregateId, 'Booking', [event1, event2], 0);

      const events = await eventStore.getEvents(aggregateId, 'Booking');
      expect(events).toHaveLength(2);
      expect(events[0].version).toBe(1);
      expect(events[1].version).toBe(2);
    });
  });

  describe('getEvents', () => {
    it('should retrieve all events for aggregate', async () => {
      const aggregateId = 'B1';
      const event1 = new BookingCreatedEvent(aggregateId, 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T1'],
        partySize: 4,
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
        durationMinutes: 90,
      });

      await eventStore.appendEvents(aggregateId, 'Booking', [event1], 0);

      const events = await eventStore.getEvents(aggregateId, 'Booking');
      expect(events).toHaveLength(1);
      expect(events[0].aggregateId).toBe(aggregateId);
    });

    it('should filter events by version range', async () => {
      const aggregateId = 'B1';
      const events = [
        new BookingCreatedEvent(aggregateId, 1, {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
        }),
        new BookingCancelledEvent(aggregateId, 2, { reason: 'Cancelled' }),
      ];

      await eventStore.appendEvents(aggregateId, 'Booking', events, 0);

      const filtered = await eventStore.getEvents(aggregateId, 'Booking', {
        fromVersion: 2,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].version).toBe(2);
    });

    it('should return empty array for non-existent aggregate', async () => {
      const events = await eventStore.getEvents('NONEXISTENT', 'Booking');
      expect(events).toHaveLength(0);
    });
  });

  describe('getEventStream', () => {
    it('should return event stream with correct version', async () => {
      const aggregateId = 'B1';
      const event1 = new BookingCreatedEvent(aggregateId, 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T1'],
        partySize: 4,
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
        durationMinutes: 90,
      });

      await eventStore.appendEvents(aggregateId, 'Booking', [event1], 0);

      const stream = await eventStore.getEventStream(aggregateId, 'Booking');
      expect(stream.aggregateId).toBe(aggregateId);
      expect(stream.version).toBe(1);
      expect(stream.events).toHaveLength(1);
    });

    it('should return version 0 for empty stream', async () => {
      const stream = await eventStore.getEventStream('EMPTY', 'Booking');
      expect(stream.version).toBe(0);
      expect(stream.events).toHaveLength(0);
    });
  });

  describe('getAllEvents', () => {
    it('should retrieve all events of a type', async () => {
      const event1 = new BookingCreatedEvent('B1', 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T1'],
        partySize: 4,
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
        durationMinutes: 90,
      });

      const event2 = new BookingCreatedEvent('B2', 1, {
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: ['T2'],
        partySize: 2,
        start: new Date('2025-10-22T21:00:00'),
        end: new Date('2025-10-22T22:00:00'),
        durationMinutes: 60,
      });

      await eventStore.appendEvents('B1', 'Booking', [event1], 0);
      await eventStore.appendEvents('B2', 'Booking', [event2], 0);

      const allEvents = await eventStore.getAllEvents('Booking');
      expect(allEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('snapshots', () => {
    it('should save and retrieve snapshot', async () => {
      const snapshot = {
        aggregateId: 'B1',
        aggregateType: 'Booking',
        version: 5,
        state: { status: 'CONFIRMED', partySize: 4 },
        createdAt: new Date(),
      };

      await eventStore.saveSnapshot(snapshot);

      const retrieved = await eventStore.getLatestSnapshot('B1', 'Booking');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.version).toBe(5);
      expect(retrieved?.aggregateId).toBe('B1');
    });

    it('should return null for non-existent snapshot', async () => {
      const snapshot = await eventStore.getLatestSnapshot('NONEXISTENT', 'Booking');
      expect(snapshot).toBeNull();
    });
  });

  describe('replay', () => {
    it('should replay events from version', async () => {
      const aggregateId = 'B1';
      const events = [
        new BookingCreatedEvent(aggregateId, 1, {
          restaurantId: 'R1',
          sectorId: 'S1',
          tableIds: ['T1'],
          partySize: 4,
          start: new Date('2025-10-22T20:00:00'),
          end: new Date('2025-10-22T21:30:00'),
          durationMinutes: 90,
        }),
        new BookingCancelledEvent(aggregateId, 2, { reason: 'Cancelled' }),
      ];

      await eventStore.appendEvents(aggregateId, 'Booking', events, 0);

      const replayedEvents: any[] = [];
      await eventStore.replay('Booking', 2, async (event) => {
        replayedEvents.push(event);
      });

      expect(replayedEvents).toHaveLength(1);
      expect(replayedEvents[0].version).toBe(2);
    });
  });
});
