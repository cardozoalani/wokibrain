import { describe, it, expect } from 'vitest';
import { TimeInterval } from './time-interval.vo';
import { ValidationError } from '@shared/errors';

describe('TimeInterval', () => {
  it('should create valid time interval', () => {
    const start = new Date('2025-10-22T20:00:00');
    const end = new Date('2025-10-22T21:30:00');

    const interval = TimeInterval.create(start, end);

    expect(interval.start).toEqual(start);
    expect(interval.end).toEqual(end);
    expect(interval.durationMinutes).toBe(90);
  });

  it('should reject intervals not aligned to 15-minute grid', () => {
    const start = new Date('2025-10-22T20:07:00');
    const end = new Date('2025-10-22T21:00:00');

    expect(() => TimeInterval.create(start, end)).toThrow(ValidationError);
  });

  it('should detect overlapping intervals', () => {
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:00:00')
    );

    const interval2 = TimeInterval.create(
      new Date('2025-10-22T20:30:00'),
      new Date('2025-10-22T21:30:00')
    );

    expect(interval1.overlaps(interval2)).toBe(true);
    expect(interval2.overlaps(interval1)).toBe(true);
  });

  it('should detect touching but non-overlapping intervals', () => {
    const interval1 = TimeInterval.create(
      new Date('2025-10-22T20:00:00'),
      new Date('2025-10-22T21:00:00')
    );

    const interval2 = TimeInterval.create(
      new Date('2025-10-22T21:00:00'),
      new Date('2025-10-22T22:00:00')
    );

    expect(interval1.overlaps(interval2)).toBe(false);
    expect(interval1.touches(interval2)).toBe(true);
  });
});
