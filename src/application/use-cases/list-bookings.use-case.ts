import { SectorRepository } from '@domain/repositories/sector.repository';
import { BookingRepository } from '@domain/repositories/booking.repository';
import { NotFoundError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { ListBookingsInput, ListBookingsOutput } from '../dtos/list-bookings.dto';
import { BookingOutput } from '../dtos/create-booking.dto';

export class ListBookingsUseCase {
  constructor(
    private sectorRepo: SectorRepository,
    private bookingRepo: BookingRepository,
    private logger: Logger
  ) {}

  async execute(input: ListBookingsInput): Promise<ListBookingsOutput> {
    const sector = await this.sectorRepo.findById(input.sectorId);
    if (!sector) {
      throw new NotFoundError('Sector', input.sectorId);
    }

    const date = new Date(input.date);
    const bookings = await this.bookingRepo.findBySectorAndDate(input.sectorId, date);

    const output: ListBookingsOutput = {
      date: input.date,
      bookings: bookings
        .filter((b) => b.isConfirmed())
        .map(
          (b): BookingOutput => ({
            id: b.id,
            restaurantId: b.restaurantId,
            sectorId: b.sectorId,
            tableIds: b.tableIds,
            partySize: b.partySize,
            start: b.interval.start.toISOString(),
            end: b.interval.end.toISOString(),
            durationMinutes: b.duration.minutes,
            status: b.status,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
          })
        ),
    };

    this.logger.info('Bookings listed', {
      sectorId: input.sectorId,
      date: input.date,
      count: output.bookings.length,
    });

    return output;
  }
}



