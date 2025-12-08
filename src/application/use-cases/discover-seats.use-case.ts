import { RestaurantRepository } from '@domain/repositories/restaurant.repository';
import { SectorRepository } from '@domain/repositories/sector.repository';
import { TableRepository } from '@domain/repositories/table.repository';
import { BookingRepository } from '@domain/repositories/booking.repository';
import { GapDiscoveryService } from '@domain/services/gap-discovery.service';
import { WokiBrainSelectionService } from '@domain/services/wokibrain-selection.service';
import { Duration } from '@domain/value-objects/duration.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { NotFoundError, OutsideServiceWindowError, NoCapacityError } from '@shared/errors';
import { Logger } from '../ports/logger.port';
import { DiscoverSeatsInput, DiscoverSeatsOutput, CandidateOutput } from '../dtos/discover-seats.dto';

export class DiscoverSeatsUseCase {
  constructor(
    private restaurantRepo: RestaurantRepository,
    private sectorRepo: SectorRepository,
    private tableRepo: TableRepository,
    private bookingRepo: BookingRepository,
    private gapService: GapDiscoveryService,
    private brainService: WokiBrainSelectionService,
    private logger: Logger
  ) {}

  async execute(input: DiscoverSeatsInput): Promise<DiscoverSeatsOutput> {
    const startTime = Date.now();

    const restaurant = await this.restaurantRepo.findById(input.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant', input.restaurantId);
    }

    const sector = await this.sectorRepo.findById(input.sectorId);
    if (!sector) {
      throw new NotFoundError('Sector', input.sectorId);
    }

    const tables = await this.tableRepo.findBySectorId(input.sectorId);
    if (tables.length === 0) {
      throw new NoCapacityError('No tables available in sector');
    }

    const duration = Duration.create(input.duration);
    const date = new Date(input.date);

    let serviceWindow: TimeWindow | null = null;
    if (input.windowStart && input.windowEnd) {
      serviceWindow = TimeWindow.create(input.windowStart, input.windowEnd);

      if (restaurant.hasServiceWindows()) {
        const isValid = restaurant.windows.some((w) => w.intersects(serviceWindow!));
        if (!isValid) {
          throw new OutsideServiceWindowError();
        }
      }
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

    if (candidates.length === 0) {
      throw new NoCapacityError();
    }

    const sortedCandidates = candidates
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.start.getTime() - b.start.getTime();
      })
      .slice(0, input.limit);

    const output: DiscoverSeatsOutput = {
      slotMinutes: 15,
      durationMinutes: input.duration,
      candidates: sortedCandidates.map((c): CandidateOutput => ({
        kind: c.kind,
        tableIds: c.tableIds,
        start: c.start.toISOString(),
        end: c.end.toISOString(),
        score: c.score,
      })),
    };

    this.logger.info('Seats discovered', {
      restaurantId: input.restaurantId,
      sectorId: input.sectorId,
      partySize: input.partySize,
      candidatesFound: sortedCandidates.length,
      durationMs: Date.now() - startTime,
    });

    return output;
  }
}



