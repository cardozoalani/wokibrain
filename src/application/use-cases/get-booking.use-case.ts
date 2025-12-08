import { BookingProjection } from '@infrastructure/projections/booking-read-model';
import { NotFoundError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { BookingOutput } from '../dtos/create-booking.dto';

export class GetBookingUseCase {
  constructor(
    private bookingProjection: BookingProjection,
    private _logger: Logger
  ) {}

  async execute(bookingId: string): Promise<BookingOutput> {
    const readModel = await this.bookingProjection.get(bookingId);

    if (!readModel) {
      throw new NotFoundError('Booking', bookingId);
    }

    return {
      id: readModel.id,
      restaurantId: readModel.restaurantId,
      sectorId: readModel.sectorId,
      tableIds: readModel.tableIds,
      partySize: readModel.partySize,
      start: readModel.start.toISOString(),
      end: readModel.end.toISOString(),
      durationMinutes: readModel.durationMinutes,
      status: readModel.status,
      guestName: readModel.guestName,
      guestEmail: readModel.guestEmail,
      guestPhone: readModel.guestPhone,
      createdAt: readModel.createdAt.toISOString(),
      updatedAt: readModel.updatedAt.toISOString(),
    };
  }
}
