import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListBookingsUseCase } from './list-bookings.use-case';
import { Sector } from '@domain/entities/sector.entity';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';
import { NotFoundError } from '@shared/errors';

describe('ListBookingsUseCase', () => {
  let useCase: ListBookingsUseCase;
  let mockSectorRepo: any;
  let mockBookingRepo: any;
  let mockLogger: any;

  beforeEach(() => {
    mockSectorRepo = {
      findById: vi.fn(),
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

    useCase = new ListBookingsUseCase(mockSectorRepo, mockBookingRepo, mockLogger);
  });

  it('should list bookings for sector and date', async () => {
    const sector = Sector.create('S1', 'R1', 'Main Hall');
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const duration = Duration.create(90);
    const booking = Booking.create(
      'B1',
      'R1',
      'S1',
      ['T1'],
      4,
      interval,
      duration,
      BookingStatus.CONFIRMED
    );

    mockSectorRepo.findById.mockResolvedValue(sector);
    mockBookingRepo.findBySectorAndDate.mockResolvedValue([booking]);

    const input = {
      sectorId: 'S1',
      date: '2025-10-22',
    };

    const result = await useCase.execute(input);

    expect(result.date).toBe('2025-10-22');
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].id).toBe('B1');
  });

  it('should filter out cancelled bookings', async () => {
    const sector = Sector.create('S1', 'R1', 'Main Hall');
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const interval2 = TimeInterval.create(
      new Date('2025-10-22T21:00:00'),
      new Date('2025-10-22T22:30:00')
    );

    const booking1 = Booking.create(
      'B1',
      'R1',
      'S1',
      ['T1'],
      4,
      interval1,
      Duration.create(90),
      BookingStatus.CONFIRMED
    );

    const booking2 = Booking.create(
      'B2',
      'R1',
      'S1',
      ['T2'],
      2,
      interval2,
      Duration.create(90),
      BookingStatus.CANCELLED
    );

    mockSectorRepo.findById.mockResolvedValue(sector);
    mockBookingRepo.findBySectorAndDate.mockResolvedValue([booking1, booking2]);

    const input = {
      sectorId: 'S1',
      date: '2025-10-22',
    };

    const result = await useCase.execute(input);

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].id).toBe('B1');
  });

  it('should throw NotFoundError for non-existent sector', async () => {
    mockSectorRepo.findById.mockResolvedValue(null);

    const input = {
      sectorId: 'NONEXISTENT',
      date: '2025-10-22',
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
  });
});



