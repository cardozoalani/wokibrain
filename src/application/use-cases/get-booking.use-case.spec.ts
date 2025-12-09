import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBookingUseCase } from './get-booking.use-case';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';
import { NotFoundError } from '@shared/errors';

describe('GetBookingUseCase', () => {
  let useCase: GetBookingUseCase;
  let mockBookingRepo: any;
  let mockLogger: any;

  beforeEach(() => {
    mockBookingRepo = {
      findById: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new GetBookingUseCase(mockBookingRepo, mockLogger);
  });

  it('should get booking by id', async () => {
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

    mockBookingRepo.findById.mockResolvedValue(booking);

    const result = await useCase.execute('B1');

    expect(result.id).toBe('B1');
    expect(result.restaurantId).toBe('R1');
    expect(result.partySize).toBe(4);
    expect(result.durationMinutes).toBe(90);
    expect(result.status).toBe(BookingStatus.CONFIRMED);
  });

  it('should throw NotFoundError for non-existent booking', async () => {
    mockBookingRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('NONEXISTENT')).rejects.toThrow(NotFoundError);
  });
});
