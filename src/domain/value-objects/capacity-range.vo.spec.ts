import { describe, it, expect } from 'vitest';
import { CapacityRange } from './capacity-range.vo';
import { ValidationError } from '@shared/errors';

describe('CapacityRange', () => {
  it('should create valid capacity range', () => {
    const range = CapacityRange.create(2, 4);
    expect(range.min).toBe(2);
    expect(range.max).toBe(4);
  });

  it('should throw error for negative capacity', () => {
    expect(() => CapacityRange.create(-1, 4)).toThrow(ValidationError);
    expect(() => CapacityRange.create(2, -1)).toThrow(ValidationError);
  });

  it('should throw error when min exceeds max', () => {
    expect(() => CapacityRange.create(5, 4)).toThrow(ValidationError);
  });

  it('should check if party size can be accommodated', () => {
    const range = CapacityRange.create(2, 4);
    expect(range.canAccommodate(2)).toBe(true);
    expect(range.canAccommodate(3)).toBe(true);
    expect(range.canAccommodate(4)).toBe(true);
    expect(range.canAccommodate(1)).toBe(false);
    expect(range.canAccommodate(5)).toBe(false);
  });

  it('should merge capacity ranges', () => {
    const range1 = CapacityRange.create(2, 4);
    const range2 = CapacityRange.create(3, 6);
    const merged = range1.merge(range2);

    expect(merged.min).toBe(5);
    expect(merged.max).toBe(10);
  });
});



