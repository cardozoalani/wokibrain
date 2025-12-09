import { DomainEvent } from '@domain/events/domain-event';
import { WebhookService } from './webhook.service';
import { WebhookEvent } from '@domain/entities/webhook.entity';
import { Logger } from '@application/ports/logger.port';

/**
 * Listens to domain events and triggers webhooks
 */
export class WebhookEventListener {
  constructor(
    private webhookService: WebhookService,
    private logger: Logger
  ) {}

  /**
   * Handle BookingCreated domain event
   */
  async handleBookingCreated(event: DomainEvent): Promise<void> {
    try {
      const data = {
        id: event.aggregateId,
        restaurantId: (event.payload as any).restaurantId,
        sectorId: (event.payload as any).sectorId,
        tableIds: (event.payload as any).tableIds,
        partySize: (event.payload as any).partySize,
        start: (event.payload as any).start,
        end: (event.payload as any).end,
        durationMinutes: (event.payload as any).durationMinutes,
        guestName: (event.payload as any).guestName,
        guestEmail: (event.payload as any).guestEmail,
        guestPhone: (event.payload as any).guestPhone,
        createdAt: event.occurredAt.toISOString(),
      };

      await this.webhookService.deliverEvent(WebhookEvent.BOOKING_CREATED, data);
    } catch (error) {
      this.logger.error('Error handling BookingCreated event for webhooks', error as Error);
    }
  }

  /**
   * Handle BookingCancelled domain event
   */
  async handleBookingCancelled(event: DomainEvent): Promise<void> {
    try {
      const data = {
        id: event.aggregateId,
        reason: (event.payload as any).reason,
        cancelledBy: (event.payload as any).cancelledBy,
        cancelledAt: event.occurredAt.toISOString(),
      };

      await this.webhookService.deliverEvent(WebhookEvent.BOOKING_CANCELLED, data);
    } catch (error) {
      this.logger.error('Error handling BookingCancelled event for webhooks', error as Error);
    }
  }

  /**
   * Handle BookingUpdated domain event
   */
  async handleBookingUpdated(event: DomainEvent): Promise<void> {
    try {
      const data = {
        id: event.aggregateId,
        changes: (event.payload as any).changes,
        updatedAt: event.occurredAt.toISOString(),
      };

      await this.webhookService.deliverEvent(WebhookEvent.BOOKING_UPDATED, data);
    } catch (error) {
      this.logger.error('Error handling BookingUpdated event for webhooks', error as Error);
    }
  }

  /**
   * Handle table unavailable scenario
   */
  async handleTableUnavailable(data: {
    restaurantId: string;
    sectorId: string;
    tableId: string;
    reason: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await this.webhookService.deliverEvent(WebhookEvent.TABLE_UNAVAILABLE, {
        restaurantId: data.restaurantId,
        sectorId: data.sectorId,
        tableId: data.tableId,
        reason: data.reason,
        timestamp: data.timestamp.toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling TableUnavailable event for webhooks', error as Error);
    }
  }
}



