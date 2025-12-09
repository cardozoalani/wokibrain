import { describe, it, expect } from 'vitest';
import { Booking, BookingStatus } from './booking.entity';
import { TimeInterval } from '../value-objects/time-interval.vo';
import { Duration } from '../value-objects/duration.vo';
import { ConflictError } from '@shared/errors';

describe('Booking', () => {
  it('should create booking', () => {
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const duration = Duration.create(90);

    const booking = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval, duration);

    expect(booking.id).toBe('B1');
    expect(booking.restaurantId).toBe('R1');
    expect(booking.sectorId).toBe('S1');
    expect(booking.tableIds).toEqual(['T1']);
    expect(booking.partySize).toBe(4);
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it('should check if booking is confirmed', () => {
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const booking = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval, Duration.create(90));

    expect(booking.isConfirmed()).toBe(true);
  });

  it('should cancel booking', () => {
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const booking = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval, Duration.create(90));

    booking.cancel();

    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(booking.isConfirmed()).toBe(false);
  });

  it('should throw error when cancelling already cancelled booking', () => {
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
      BookingStatus.CANCELLED
    );

    expect(() => booking.cancel()).toThrow(ConflictError);
  });

  it('should detect conflicts with overlapping bookings', () => {
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const interval2 = TimeInterval.create(
      new Date('2025-10-22T20:30:00'),
      new Date('2025-10-22T22:00:00')
    );

    const booking1 = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval1, Duration.create(90));
    const booking2 = Booking.create('B2', 'R1', 'S1', ['T1'], 2, interval2, Duration.create(90));

    expect(booking1.conflictsWith(booking2)).toBe(true);
    expect(booking2.conflictsWith(booking1)).toBe(true);
  });

  it('should not detect conflicts for different tables', () => {
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const interval2 = TimeInterval.create(
      new Date('2025-10-22T20:30:00'),
      new Date('2025-10-22T22:00:00')
    );

    const booking1 = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval1, Duration.create(90));
    const booking2 = Booking.create('B2', 'R1', 'S1', ['T2'], 2, interval2, Duration.create(90));

    expect(booking1.conflictsWith(booking2)).toBe(false);
  });

  it('should not detect conflicts for cancelled bookings', () => {
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const interval2 = TimeInterval.create(
      new Date('2025-10-22T20:30:00'),
      new Date('2025-10-22T22:00:00')
    );

    const booking1 = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval1, Duration.create(90));
    const booking2 = Booking.create(
      'B2',
      'R1',
      'S1',
      ['T1'],
      2,
      interval2,
      Duration.create(90),
      BookingStatus.CANCELLED
    );

    expect(booking1.conflictsWith(booking2)).toBe(false);
  });

  it('should serialize to JSON', () => {
    const interval = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:30:00')
    );
    const booking = Booking.create('B1', 'R1', 'S1', ['T1'], 4, interval, Duration.create(90));

    const json = booking.toJSON();

    expect(json.id).toBe('B1');
    expect(json.restaurantId).toBe('R1');
    expect(json.partySize).toBe(4);
    expect(json.durationMinutes).toBe(90);
    expect(json.status).toBe(BookingStatus.CONFIRMED);
  });
});
