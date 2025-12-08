import { BookingRepository } from '@domain/repositories/booking.repository';
import { NotFoundError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { WebhookService } from '@infrastructure/webhooks/webhook.service';
import { WebhookEvent } from '@domain/entities/webhook.entity';
import { BookingCancelledEvent } from '@domain/events/booking-events';
import { EventPublisherService } from '@infrastructure/events/event-publisher.service';

export class DeleteBookingUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private logger: Logger,
    private webhookService?: WebhookService,
    private eventPublisher?: EventPublisherService
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    booking.cancel();
    await this.bookingRepo.save(booking);

    this.logger.info('Booking cancelled', {
      bookingId: booking.id,
      restaurantId: booking.restaurantId,
      sectorId: booking.sectorId,
      tableIds: booking.tableIds,
    });

    // Publish domain event
    if (this.eventPublisher) {
      const event = new BookingCancelledEvent(
        booking.id,
        2, // Version incremented after cancel
        {
          reason: 'User cancellation',
        },
        {
          cancelledAt: new Date().toISOString(),
        }
      );
      await this.eventPublisher.publish(event);
    }

    // Trigger webhook asynchronously (don't wait for it)
    if (this.webhookService) {
      this.webhookService
        .deliverEvent(WebhookEvent.BOOKING_CANCELLED, {
          id: booking.id,
          restaurantId: booking.restaurantId,
          sectorId: booking.sectorId,
          tableIds: booking.tableIds,
          cancelledAt: new Date().toISOString(),
        })
        .catch((error) => {
          this.logger.error('Failed to deliver booking.cancelled webhook', error as Error);
        });
    }
  }
}

