import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoverSeatsUseCase } from './discover-seats.use-case';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Sector } from '@domain/entities/sector.entity';
import { Table } from '@domain/entities/table.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';
import { GapDiscoveryService } from '@domain/services/gap-discovery.service';
import { WokiBrainSelectionService } from '@domain/services/wokibrain-selection.service';
import { NotFoundError, OutsideServiceWindowError, NoCapacityError } from '@shared/errors';

describe('DiscoverSeatsUseCase', () => {
  let useCase: DiscoverSeatsUseCase;
  let mockRestaurantRepo: any;
  let mockSectorRepo: any;
  let mockTableRepo: any;
  let mockBookingRepo: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRestaurantRepo = {
      findById: vi.fn(),
    };

    mockSectorRepo = {
      findById: vi.fn(),
    };

    mockTableRepo = {
      findBySectorId: vi.fn(),
    };

    mockBookingRepo = {
      findBySectorAndDate: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const gapService = new GapDiscoveryService();
    const brainService = new WokiBrainSelectionService();

    useCase = new DiscoverSeatsUseCase(
      mockRestaurantRepo,
      mockSectorRepo,
      mockTableRepo,
      mockBookingRepo,
      gapService,
      brainService,
      mockLogger
    );
  });

  it('should discover available seats', async () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      [TimeWindow.create('20:00', '23:45')]
    );

    const sector = Sector.create('S1', 'R1', 'Main Hall');
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));

    mockRestaurantRepo.findById.mockResolvedValue(restaurant);
    mockSectorRepo.findById.mockResolvedValue(sector);
    mockTableRepo.findBySectorId.mockResolvedValue([table]);
    mockBookingRepo.findBySectorAndDate.mockResolvedValue([]);

    const input = {
      restaurantId: 'R1',
      sectorId: 'S1',
      date: '2025-10-22',
      partySize: 3,
      duration: 90,
      windowStart: '20:00',
      windowEnd: '23:45',
    };

    const result = await useCase.execute(input);

    expect(result.slotMinutes).toBe(15);
    expect(result.durationMinutes).toBe(90);
    expect(Array.isArray(result.candidates)).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('should throw NotFoundError for non-existent restaurant', async () => {
    mockRestaurantRepo.findById.mockResolvedValue(null);

    const input = {
      restaurantId: 'NONEXISTENT',
      sectorId: 'S1',
      date: '2025-10-22',
      partySize: 3,
      duration: 90,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for non-existent sector', async () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      []
    );

    mockRestaurantRepo.findById.mockResolvedValue(restaurant);
    mockSectorRepo.findById.mockResolvedValue(null);

    const input = {
      restaurantId: 'R1',
      sectorId: 'NONEXISTENT',
      date: '2025-10-22',
      partySize: 3,
      duration: 90,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
  });

  it('should throw NoCapacityError when no tables available', async () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      []
    );

    const sector = Sector.create('S1', 'R1', 'Main Hall');

    mockRestaurantRepo.findById.mockResolvedValue(restaurant);
    mockSectorRepo.findById.mockResolvedValue(sector);
    mockTableRepo.findBySectorId.mockResolvedValue([]);

    const input = {
      restaurantId: 'R1',
      sectorId: 'S1',
      date: '2025-10-22',
      partySize: 3,
      duration: 90,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NoCapacityError);
  });

  it('should throw OutsideServiceWindowError for invalid window', async () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      [TimeWindow.create('20:00', '23:45')]
    );

    const sector = Sector.create('S1', 'R1', 'Main Hall');
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));

    mockRestaurantRepo.findById.mockResolvedValue(restaurant);
    mockSectorRepo.findById.mockResolvedValue(sector);
    mockTableRepo.findBySectorId.mockResolvedValue([table]);

    const input = {
      restaurantId: 'R1',
      sectorId: 'S1',
      date: '2025-10-22',
      partySize: 3,
      duration: 90,
      windowStart: '02:00',
      windowEnd: '04:00',
    };

    await expect(useCase.execute(input)).rejects.toThrow(OutsideServiceWindowError);
  });
});
