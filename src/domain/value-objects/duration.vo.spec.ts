import { describe, it, expect } from 'vitest';
import { Duration } from './duration.vo';
import { ValidationError } from '@shared/errors';

describe('Duration', () => {
  it('should create valid duration', () => {
    const duration = Duration.create(90);
    expect(duration.minutes).toBe(90);
  });

  it('should throw error for duration below minimum', () => {
    expect(() => Duration.create(29)).toThrow(ValidationError);
    expect(() => Duration.create(0)).toThrow(ValidationError);
  });

  it('should throw error for duration above maximum', () => {
    expect(() => Duration.create(181)).toThrow(ValidationError);
    expect(() => Duration.create(200)).toThrow(ValidationError);
  });

  it('should throw error for duration not multiple of 15', () => {
    expect(() => Duration.create(31)).toThrow(ValidationError);
    expect(() => Duration.create(92)).toThrow(ValidationError);
  });

  it('should calculate slots correctly', () => {
    expect(Duration.create(30).slots).toBe(2);
    expect(Duration.create(45).slots).toBe(3);
    expect(Duration.create(90).slots).toBe(6);
    expect(Duration.create(180).slots).toBe(12);
  });

  it('should add duration to date', () => {
    const duration = Duration.create(90);
    const date = new Date('2025-10-22T20:00:00');
    const result = duration.addTo(date);

    expect(result.getTime() - date.getTime()).toBe(90 * 60 * 1000);
  });
});
