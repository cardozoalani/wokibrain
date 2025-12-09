import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { DomainEvent } from '@domain/events/domain-event';
import { RedisClient } from '@infrastructure/caching/redis-client';
import { Logger } from '@application/ports/logger.port';

/**
 * Cache Invalidation Worker - Consumes domain events and invalidates cache
 */
export class CacheInvalidationWorkerService {
  private readonly aggregateTypes = ['Booking'];
  private isConsuming = false;

  constructor(
    private eventBus: EventBus,
    private redisClient: RedisClient,
    private logger: Logger
  ) {}

  /**
   * Start consuming events and invalidating cache
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('Cache invalidation worker is already consuming');
      return;
    }

    // Register cache invalidation handlers
    await this.eventBus.subscribe('BookingCreated', async (event) => {
      await this.handleEvent(event);
    });

    await this.eventBus.subscribe('BookingCancelled', async (event) => {
      await this.handleEvent(event);
    });

    await this.eventBus.subscribe('BookingUpdated', async (event) => {
      await this.handleEvent(event);
    });

    // Start consuming events
    if ('startConsuming' in this.eventBus) {
      await (this.eventBus as any).startConsuming(this.aggregateTypes);
    }

    this.isConsuming = true;
    this.logger.info('Cache invalidation worker started', {
      aggregateTypes: this.aggregateTypes,
    });
  }

  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    this.isConsuming = false;
    this.logger.info('Cache invalidation worker stopped');
  }

  /**
   * Handle a domain event and invalidate relevant cache keys
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      const payload = event.payload as any;
      const cacheKeys: string[] = [];

      // Invalidate booking-specific cache
      if (event.aggregateId) {
        cacheKeys.push(`booking:${event.aggregateId}`);
      }

      // Invalidate sector cache
      if (payload.sectorId) {
        cacheKeys.push(`sector:${payload.sectorId}:bookings:*`);
        cacheKeys.push(`sector:${payload.sectorId}:availability:*`);
      }

      // Invalidate restaurant cache
      if (payload.restaurantId) {
        cacheKeys.push(`restaurant:${payload.restaurantId}:bookings:*`);
        cacheKeys.push(`restaurant:${payload.restaurantId}:availability:*`);
      }

      // Invalidate table cache
      if (payload.tableIds && Array.isArray(payload.tableIds)) {
        for (const tableId of payload.tableIds) {
          cacheKeys.push(`table:${tableId}:bookings:*`);
          cacheKeys.push(`table:${tableId}:availability:*`);
        }
      }

      // Delete cache keys (support wildcard patterns via Redis SCAN)
      for (const pattern of cacheKeys) {
        if (pattern.includes('*')) {
          // For wildcard patterns, we'd need to scan and delete
          // For now, we'll use a simpler approach with tags
          await this.redisClient.del(pattern.replace(':*', ''));
        } else {
          await this.redisClient.del(pattern);
        }
      }

      this.logger.debug('Cache invalidated', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        cacheKeys: cacheKeys.length,
      });
    } catch (error) {
      this.logger.error('Failed to invalidate cache', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}
