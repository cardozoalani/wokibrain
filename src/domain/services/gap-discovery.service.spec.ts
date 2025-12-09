import { describe, it, expect } from 'vitest';
import { GapDiscoveryService } from './gap-discovery.service';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { TimeInterval } from '../value-objects/time-interval.vo';
import { Duration } from '../value-objects/duration.vo';
import { Timezone } from '../value-objects/timezone.vo';
import { TimeWindow } from '../value-objects/time-window.vo';

describe('GapDiscoveryService', () => {
  const service = new GapDiscoveryService();
  const timezone = Timezone.create('America/Argentina/Buenos_Aires');

  it('should find gaps between bookings', () => {
    const date = new Date('2025-10-22T00:00:00-03:00');
    const serviceWindow = TimeWindow.create('20:00', '23:45');

    const booking1Start = new Date('2025-10-22T20:30:00-03:00');
    const booking1End = new Date('2025-10-22T21:15:00-03:00');
    const interval1 = TimeInterval.create(booking1Start, booking1End);
    const duration1 = Duration.create(45);

    const booking = Booking.create(
      'B1',
      'R1',
      'S1',
      ['T1'],
      3,
      interval1,
      duration1,
      BookingStatus.CONFIRMED
    );

    const gaps = service.findGapsForTable([booking], date, timezone, serviceWindow);

    // Should find at least one gap (either before or after the booking)
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('should handle empty booking list', () => {
    const date = new Date('2025-10-22T00:00:00-03:00');
    const serviceWindow = TimeWindow.create('20:00', '23:45');

    const gaps = service.findGapsForTable([], date, timezone, serviceWindow);

    expect(gaps.length).toBe(1);
  });

  it('should intersect combo gaps correctly', () => {
    const gap1 = [
      { start: new Date('2025-10-22T20:00:00'), end: new Date('2025-10-22T21:00:00') },
      { start: new Date('2025-10-22T22:00:00'), end: new Date('2025-10-22T23:00:00') },
    ];

    const gap2 = [
      { start: new Date('2025-10-22T20:30:00'), end: new Date('2025-10-22T21:30:00') },
      { start: new Date('2025-10-22T22:00:00'), end: new Date('2025-10-22T23:30:00') },
    ];

    const intersection = service.findComboGaps([gap1, gap2]);

    expect(intersection.length).toBe(2);
    expect(intersection[0].start.getTime()).toBe(new Date('2025-10-22T20:30:00').getTime());
    expect(intersection[0].end.getTime()).toBe(new Date('2025-10-22T21:00:00').getTime());
  });
});
