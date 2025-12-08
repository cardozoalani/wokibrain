import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBookingUseCase } from './get-booking.use-case';
import { BookingReadModel } from '@infrastructure/projections/booking-read-model';
import { NotFoundError } from '@shared/errors';

describe('GetBookingUseCase', () => {
  let useCase: GetBookingUseCase;
  let mockBookingProjection: any;
  let mockLogger: any;

  beforeEach(() => {
    mockBookingProjection = {
      get: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new GetBookingUseCase(mockBookingProjection, mockLogger);
  });

  it('should get booking by id with guest information', async () => {
    const readModel: BookingReadModel = {
      id: 'B1',
      restaurantId: 'R1',
      sectorId: 'S1',
      tableIds: ['T1'],
      partySize: 4,
      start: new Date('2025-10-22T20:00:00'),
      end: new Date('2025-10-22T21:30:00'),
      durationMinutes: 90,
      status: 'CONFIRMED',
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+1234567890',
      createdAt: new Date('2025-10-22T19:00:00'),
      updatedAt: new Date('2025-10-22T19:00:00'),
      version: 1,
    };

    mockBookingProjection.get.mockResolvedValue(readModel);

    const result = await useCase.execute('B1');

    expect(result.id).toBe('B1');
    expect(result.restaurantId).toBe('R1');
    expect(result.partySize).toBe(4);
    expect(result.durationMinutes).toBe(90);
    expect(result.status).toBe('CONFIRMED');
    expect(result.guestName).toBe('John Doe');
    expect(result.guestEmail).toBe('john@example.com');
    expect(result.guestPhone).toBe('+1234567890');
  });

  it('should get booking without guest information', async () => {
    const readModel: BookingReadModel = {
      id: 'B1',
      restaurantId: 'R1',
      sectorId: 'S1',
      tableIds: ['T1'],
      partySize: 4,
      start: new Date('2025-10-22T20:00:00'),
      end: new Date('2025-10-22T21:30:00'),
      durationMinutes: 90,
      status: 'CONFIRMED',
      createdAt: new Date('2025-10-22T19:00:00'),
      updatedAt: new Date('2025-10-22T19:00:00'),
      version: 1,
    };

    mockBookingProjection.get.mockResolvedValue(readModel);

    const result = await useCase.execute('B1');

    expect(result.id).toBe('B1');
    expect(result.guestName).toBeUndefined();
    expect(result.guestEmail).toBeUndefined();
    expect(result.guestPhone).toBeUndefined();
  });

  it('should throw NotFoundError for non-existent booking', async () => {
    mockBookingProjection.get.mockResolvedValue(null);

    await expect(useCase.execute('NONEXISTENT')).rejects.toThrow(NotFoundError);
  });
});
