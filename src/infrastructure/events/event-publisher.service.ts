import { DomainEvent } from '@domain/events/domain-event';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { Logger } from '@application/ports/logger.port';

/**
 * Service to publish domain events
 * Abstracts event publishing logic and handles fallback if EventBus is not available
 */
export class EventPublisherService {
  constructor(
    private eventBus: EventBus | null,
    private logger: Logger
  ) {}

  /**
   * Publish a domain event
   * If EventBus is not available, logs the event but doesn't throw
   */
  async publish(event: DomainEvent): Promise<void> {
    if (!this.eventBus) {
      this.logger.debug('EventBus not available, event not published', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
      return;
    }

    try {
      await this.eventBus.publish(event);
      this.logger.debug('Domain event published', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
      });
    } catch (error) {
      this.logger.error('Failed to publish domain event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
      // Don't throw - event publishing should not break the main flow
    }
  }

  /**
   * Publish multiple domain events in batch
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    if (!this.eventBus) {
      this.logger.debug('EventBus not available, events not published', {
        count: events.length,
      });
      return;
    }

    try {
      await this.eventBus.publishBatch(events);
      this.logger.debug('Domain events published in batch', {
        count: events.length,
      });
    } catch (error) {
      this.logger.error('Failed to publish domain events batch', error as Error, {
        count: events.length,
      });
    }
  }
}
