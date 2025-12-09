import { Logger } from '@application/ports/logger.port';
import { DomainEvent } from '@domain/events/domain-event';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { MongoDBBookingProjection } from '@infrastructure/projections/mongodb-booking-projection';

/**
 * CQRS Projection Worker - Consumes domain events and updates read models
 */
export class CQRSProjectionWorkerService {
  private readonly aggregateTypes = ['Booking'];
  private isConsuming = false;

  constructor(
    private eventBus: EventBus,
    private bookingProjection: MongoDBBookingProjection,
    private logger: Logger
  ) {}

  /**
   * Start consuming events and updating projections
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('CQRS projection worker is already consuming');
      return;
    }

    // Register projection handler
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
    this.logger.info('CQRS projection worker started', {
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
    this.logger.info('CQRS projection worker stopped');
  }

  /**
   * Handle a domain event and update projections
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      await this.bookingProjection.project(event);
      this.logger.debug('Projection updated', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error('Failed to update projection', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
      // Don't throw - let Kafka handle retries
    }
  }
}
