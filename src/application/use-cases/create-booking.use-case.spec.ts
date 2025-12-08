import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBookingUseCase } from './create-booking.use-case';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Sector } from '@domain/entities/sector.entity';
import { Table } from '@domain/entities/table.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';
import { GapDiscoveryService } from '@domain/services/gap-discovery.service';
import { WokiBrainSelectionService } from '@domain/services/wokibrain-selection.service';
import { LockService } from '@domain/services/lock.service';
import { NoCapacityError } from '@shared/errors';

describe('CreateBookingUseCase', () => {
  let useCase: CreateBookingUseCase;
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
      findByIdempotencyKey: vi.fn(),
      save: vi.fn(),
      saveWithIdempotencyKey: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const gapService = new GapDiscoveryService();
    const brainService = new WokiBrainSelectionService();
    const lockService = new LockService();

    useCase = new CreateBookingUseCase(
      mockRestaurantRepo,
      mockSectorRepo,
      mockTableRepo,
      mockBookingRepo,
      gapService,
      brainService,
      lockService,
      mockLogger
    );
  });

  it('should create booking successfully', async () => {
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
    mockBookingRepo.findByIdempotencyKey.mockResolvedValue(null);

    const input = {
      restaurantId: 'R1',
      sectorId: 'S1',
      partySize: 3,
      durationMinutes: 90,
      date: '2025-10-22',
      windowStart: '20:00',
      windowEnd: '23:45',
    };

    const result = await useCase.execute(input);

    expect(result.partySize).toBe(3);
    expect(result.durationMinutes).toBe(90);
    expect(mockBookingRepo.save).toHaveBeenCalled();
  });

  it('should return existing booking with same idempotency key', async () => {
    const existingBooking = {
      id: 'B1',
      restaurantId: 'R1',
      sectorId: 'S1',
      tableIds: ['T1'],
      partySize: 3,
      interval: {
        start: new Date('2025-10-22T20:00:00'),
        end: new Date('2025-10-22T21:30:00'),
      },
      duration: { minutes: 90 },
      status: 'CONFIRMED',
      createdAt: new Date(),
      updatedAt: new Date(),
      isConfirmed: () => true,
      toJSON: () => ({}),
    } as any;

    mockBookingRepo.findByIdempotencyKey.mockResolvedValue(existingBooking);

    const input = {
      restaurantId: 'R1',
      sectorId: 'S1',
      partySize: 3,
      durationMinutes: 90,
      date: '2025-10-22',
    };

    const result = await useCase.execute(input, 'idempotency-key-123');

    expect(result.id).toBe('B1');
    expect(mockBookingRepo.save).not.toHaveBeenCalled();
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
      partySize: 10,
      durationMinutes: 90,
      date: '2025-10-22',
    };

    await expect(useCase.execute(input)).rejects.toThrow(NoCapacityError);
  });
});



