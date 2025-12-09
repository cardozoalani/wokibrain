import { ValueObject } from '@shared/value-object';
import { ValidationError } from '@shared/errors';

interface CapacityRangeProps {
  min: number;
  max: number;
}

export class CapacityRange extends ValueObject<CapacityRangeProps> {
  private constructor(value: CapacityRangeProps) {
    super(value);
  }

  static create(min: number, max: number): CapacityRange {
    // Validate that min and max are numbers
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new ValidationError('Capacity min and max must be numbers', 'capacity');
    }

    // Validate that min and max are not NaN or Infinity
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new ValidationError('Capacity min and max must be finite numbers', 'capacity');
    }

    if (min <= 0 || max <= 0) {
      throw new ValidationError('Capacity must be positive', 'capacity');
    }

    if (min > max) {
      throw new ValidationError('Min capacity cannot exceed max capacity', 'capacity');
    }

    return new CapacityRange({ min, max });
  }

  get min(): number {
    return this._value.min;
  }

  get max(): number {
    return this._value.max;
  }

  canAccommodate(partySize: number): boolean {
    return partySize >= this._value.min && partySize <= this._value.max;
  }

  merge(other: CapacityRange): CapacityRange {
    return CapacityRange.create(
      this._value.min + other.min,
      this._value.max + other.max
    );
  }
}



