import { randomUUID } from 'crypto';
import { RestaurantRepository } from '@domain/repositories/restaurant.repository';
import { SectorRepository } from '@domain/repositories/sector.repository';
import { TableRepository } from '@domain/repositories/table.repository';
import { BookingRepository } from '@domain/repositories/booking.repository';
import { GapDiscoveryService } from '@domain/services/gap-discovery.service';
import { WokiBrainSelectionService } from '@domain/services/wokibrain-selection.service';
import { LockService } from '@domain/services/lock.service';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { Duration } from '@domain/value-objects/duration.vo';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { NotFoundError, NoCapacityError, ConflictError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { CreateBookingInput, BookingOutput } from '../dtos/create-booking.dto';
import { WebhookService } from '@infrastructure/webhooks/webhook.service';
import { WebhookEvent } from '@domain/entities/webhook.entity';
import { BookingCreatedEvent } from '@domain/events/booking-events';
import { EventPublisherService } from '@infrastructure/events/event-publisher.service';

export class CreateBookingUseCase {
  constructor(
    private restaurantRepo: RestaurantRepository,
    private sectorRepo: SectorRepository,
    private tableRepo: TableRepository,
    private bookingRepo: BookingRepository,
    private gapService: GapDiscoveryService,
    private brainService: WokiBrainSelectionService,
    private lockService: LockService,
    private logger: Logger,
    private webhookService?: WebhookService,
    private eventPublisher?: EventPublisherService
  ) {}

  async execute(input: CreateBookingInput, idempotencyKey?: string): Promise<BookingOutput> {
    const startTime = Date.now();

    // If idempotency key is provided, check first (outside lock for early return)
    // But we'll also check inside the lock to prevent race conditions
    if (idempotencyKey) {
      const existing = await this.bookingRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        this.logger.info('Idempotent booking request', { bookingId: existing.id });
        return this.mapToOutput(existing);
      }
    }

    const restaurant = await this.restaurantRepo.findById(input.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant', input.restaurantId);
    }

    const sector = await this.sectorRepo.findById(input.sectorId);
    if (!sector) {
      throw new NotFoundError('Sector', input.sectorId);
    }

    const tables = await this.tableRepo.findBySectorId(input.sectorId);
    const duration = Duration.create(input.durationMinutes);
    const date = new Date(input.date);

    let serviceWindow: TimeWindow | null = null;
    if (input.windowStart && input.windowEnd) {
      serviceWindow = TimeWindow.create(input.windowStart, input.windowEnd);
    }

    const bookings = await this.bookingRepo.findBySectorAndDate(input.sectorId, date);

    const tableGaps = new Map();
    for (const table of tables) {
      const tableBookings = bookings.filter((b) => b.tableIds.includes(table.id));
      const gaps = this.gapService.findGapsForTable(
        tableBookings,
        date,
        restaurant.timezone,
        serviceWindow
      );
      tableGaps.set(table.id, gaps);
    }

    const candidates = this.brainService.generateCandidates(
      tables,
      tableGaps,
      input.partySize,
      duration
    );

    const selected = this.brainService.selectBestCandidate(candidates);
    if (!selected) {
      throw new NoCapacityError();
    }

    // Use idempotency key as lock key if provided, otherwise use table-based lock
    // This ensures that requests with the same idempotency key are serialized
    const lockKey = idempotencyKey
      ? `idempotency:${idempotencyKey}`
      : this.lockService.generateLockKey(
          input.restaurantId,
          input.sectorId,
          selected.tableIds,
          selected.start
        );

    const booking = await this.lockService.acquire(lockKey, async () => {
      // Check idempotency again inside the lock to prevent race conditions
      if (idempotencyKey) {
        const existing = await this.bookingRepo.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          this.logger.info('Idempotent booking request (inside lock)', { bookingId: existing.id });
          return existing;
        }
      }

      const latestBookings = await this.bookingRepo.findBySectorAndDate(input.sectorId, date);

      for (const tableId of selected.tableIds) {
        const conflicts = latestBookings.filter(
          (b) =>
            b.isConfirmed() &&
            b.tableIds.includes(tableId) &&
            b.interval.overlaps(TimeInterval.create(selected.start, selected.end))
        );

        if (conflicts.length > 0) {
          throw new ConflictError('Selected tables are no longer available');
        }
      }

      const interval = TimeInterval.create(selected.start, selected.end);
      const newBooking = Booking.create(
        randomUUID(),
        input.restaurantId,
        input.sectorId,
        selected.tableIds,
        input.partySize,
        interval,
        duration,
        BookingStatus.CONFIRMED
      );

      if (idempotencyKey) {
        await this.bookingRepo.saveWithIdempotencyKey(newBooking, idempotencyKey);
      } else {
        await this.bookingRepo.save(newBooking);
      }

      // Publish domain event
      if (this.eventPublisher) {
        const event = new BookingCreatedEvent(
          newBooking.id,
          1,
          {
            restaurantId: newBooking.restaurantId,
            sectorId: newBooking.sectorId,
            tableIds: newBooking.tableIds,
            partySize: newBooking.partySize,
            start: newBooking.interval.start,
            end: newBooking.interval.end,
            durationMinutes: newBooking.duration.minutes,
            guestName: input.guestName,
            guestEmail: input.guestEmail,
            guestPhone: input.guestPhone,
          },
          {
            idempotencyKey,
            createdAt: newBooking.createdAt.toISOString(),
          }
        );
        await this.eventPublisher.publish(event);
      }

      return newBooking;
    });

    this.logger.info('Booking created', {
      bookingId: booking.id,
      restaurantId: input.restaurantId,
      sectorId: input.sectorId,
      partySize: input.partySize,
      tableIds: booking.tableIds,
      kind: booking.tableIds.length === 1 ? 'single' : 'combo',
      durationMs: Date.now() - startTime,
    });

    // Trigger webhook asynchronously (don't wait for it)
    if (this.webhookService) {
      this.webhookService
        .deliverEvent(WebhookEvent.BOOKING_CREATED, {
          id: booking.id,
          restaurantId: booking.restaurantId,
          sectorId: booking.sectorId,
          tableIds: booking.tableIds,
          partySize: booking.partySize,
          start: booking.interval.start.toISOString(),
          end: booking.interval.end.toISOString(),
          durationMinutes: booking.duration.minutes,
          status: booking.status,
          createdAt: booking.createdAt.toISOString(),
        })
        .catch((error) => {
          this.logger.error('Failed to deliver booking.created webhook', error as Error);
        });
    }

    return this.mapToOutput(booking);
  }

  private mapToOutput(booking: Booking): BookingOutput {
    return {
      id: booking.id,
      restaurantId: booking.restaurantId,
      sectorId: booking.sectorId,
      tableIds: booking.tableIds,
      partySize: booking.partySize,
      start: booking.interval.start.toISOString(),
      end: booking.interval.end.toISOString(),
      durationMinutes: booking.duration.minutes,
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}
