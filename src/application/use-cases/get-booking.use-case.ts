import { BookingRepository } from '@domain/repositories/booking.repository';
import { NotFoundError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { BookingOutput } from '../dtos/create-booking.dto';

export class GetBookingUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private _logger: Logger
  ) {}

  async execute(bookingId: string): Promise<BookingOutput> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

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
