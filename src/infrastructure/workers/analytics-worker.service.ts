import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { DomainEvent } from '@domain/events/domain-event';
import { Logger } from '@application/ports/logger.port';
import { Collection, Db } from 'mongodb';

interface AnalyticsEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Analytics Worker - Consumes domain events and stores them for analytics
 */
export class AnalyticsWorkerService {
  private readonly aggregateTypes = ['Booking'];
  private isConsuming = false;
  private analyticsCollection: Collection<AnalyticsEvent>;

  constructor(
    private eventBus: EventBus,
    private db: Db,
    private logger: Logger
  ) {
    this.analyticsCollection = db.collection('analytics_events');
    this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    await this.analyticsCollection.createIndex({ eventType: 1, occurredAt: -1 });
    await this.analyticsCollection.createIndex({ aggregateType: 1, occurredAt: -1 });
    await this.analyticsCollection.createIndex({ occurredAt: -1 });
    await this.analyticsCollection.createIndex({ 'payload.restaurantId': 1, occurredAt: -1 });
  }

  /**
   * Start consuming events and storing for analytics
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('Analytics worker is already consuming');
      return;
    }

    // Register analytics handlers for all booking events
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
    this.logger.info('Analytics worker started', {
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
    this.logger.info('Analytics worker stopped');
  }

  /**
   * Handle a domain event and store for analytics
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as Record<string, unknown>,
        occurredAt: event.occurredAt,
        metadata: event.metadata,
      };

      await this.analyticsCollection.insertOne(analyticsEvent);

      this.logger.debug('Event stored for analytics', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error('Failed to store event for analytics', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}
