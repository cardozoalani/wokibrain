import { describe, it, expect } from 'vitest';
import { TimeWindow } from './time-window.vo';
import { ValidationError } from '@shared/errors';

describe('TimeWindow', () => {
  it('should create valid time window', () => {
    const window = TimeWindow.create('20:00', '23:45');
    expect(window.start).toBe('20:00');
    expect(window.end).toBe('23:45');
  });

  it('should throw error for invalid start time format', () => {
    expect(() => TimeWindow.create('25:00', '23:00')).toThrow(ValidationError);
    expect(() => TimeWindow.create('20:60', '23:00')).toThrow(ValidationError);
    expect(() => TimeWindow.create('invalid', '23:00')).toThrow(ValidationError);
  });

  it('should throw error for invalid end time format', () => {
    expect(() => TimeWindow.create('20:00', '25:00')).toThrow(ValidationError);
    expect(() => TimeWindow.create('20:00', 'invalid')).toThrow(ValidationError);
  });

  it('should throw error when start is after end', () => {
    expect(() => TimeWindow.create('23:00', '20:00')).toThrow(ValidationError);
  });

  it('should throw error when start equals end', () => {
    expect(() => TimeWindow.create('20:00', '20:00')).toThrow(ValidationError);
  });

  it('should check if time is contained', () => {
    const window = TimeWindow.create('20:00', '23:45');
    expect(window.contains('20:00')).toBe(true);
    expect(window.contains('21:30')).toBe(true);
    expect(window.contains('23:44')).toBe(true);
    expect(window.contains('23:45')).toBe(false);
    expect(window.contains('19:59')).toBe(false);
  });

  it('should check if windows intersect', () => {
    const window1 = TimeWindow.create('20:00', '23:45');
    const window2 = TimeWindow.create('21:00', '22:00');
    const window3 = TimeWindow.create('19:00', '20:00');
    // window4 would need to wrap around midnight, but TimeWindow doesn't support that
    // So we'll test with a window that ends at 23:45 (touching but not overlapping)
    const window4 = TimeWindow.create('23:45', '23:59');

    expect(window1.intersects(window2)).toBe(true);
    expect(window1.intersects(window3)).toBe(false); // 19:00-20:00 doesn't intersect 20:00-23:45
    expect(window1.intersects(window4)).toBe(false); // 23:45-23:59 doesn't intersect 20:00-23:45 (touching at end)
  });
});

