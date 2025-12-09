import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KafkaEventBus } from './event-bus';
import { KafkaClient } from './kafka-client';
import { BookingCreatedEvent } from '@domain/events/booking-events';

describe('KafkaEventBus', () => {
  let eventBus: KafkaEventBus;
  let mockKafka: any;
  let mockLogger: any;

  beforeEach(() => {
    mockKafka = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
      publishBatch: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    eventBus = new KafkaEventBus(mockKafka as KafkaClient, mockLogger);
  });

  describe('publish', () => {
    it('should publish event to Kafka', async () => {
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
        },
        { userId: 'U1' }
      );

      await eventBus.publish(event);

      expect(mockKafka.publishEvent).toHaveBeenCalledWith('wokibrain.booking.events', event);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events', async () => {
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
          sectorId: 'S1',
          tableIds: ['T2'],
          partySize: 2,
          start: new Date('2025-10-22T21:00:00'),
          end: new Date('2025-10-22T22:00:00'),
          durationMinutes: 60,
        },
        { userId: 'U1' }
      );

      await eventBus.publishBatch([event1, event2]);

      expect(mockKafka.publishBatch).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should register event handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('BookingCreated', handler);

      expect(mockLogger.info).toHaveBeenCalledWith('Event handler registered', {
        eventType: 'BookingCreated',
      });
    });
  });
});



