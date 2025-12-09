import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteBookingUseCase } from './delete-booking.use-case';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';
import { NotFoundError } from '@shared/errors';

describe('DeleteBookingUseCase', () => {
  let useCase: DeleteBookingUseCase;
  let mockBookingRepo: any;
  let mockLogger: any;

  beforeEach(() => {
    mockBookingRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new DeleteBookingUseCase(mockBookingRepo, mockLogger);
  });

  it('should cancel booking', async () => {
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const booking = Booking.create(
      'B1',
      'R1',
      'S1',
      ['T1'],
      4,
      interval,
      Duration.create(90),
      BookingStatus.CONFIRMED
    );

    mockBookingRepo.findById.mockResolvedValue(booking);

    await useCase.execute('B1');

    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(mockBookingRepo.save).toHaveBeenCalledWith(booking);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should throw NotFoundError for non-existent booking', async () => {
    mockBookingRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('NONEXISTENT')).rejects.toThrow(NotFoundError);
  });
});
