import { ValueObject } from '@shared/value-object';
import { ValidationError } from '@shared/errors';

interface TimeIntervalProps {
  start: Date;
  end: Date;
}

export class TimeInterval extends ValueObject<TimeIntervalProps> {
  private constructor(value: TimeIntervalProps) {
    super(value);
  }

  static create(start: Date, end: Date): TimeInterval {
    if (start >= end) {
      throw new ValidationError('Start time must be before end time', 'timeInterval');
    }

    const startMinutes = start.getMinutes();
    const endMinutes = end.getMinutes();

    if (startMinutes % 15 !== 0 || endMinutes % 15 !== 0) {
      throw new ValidationError('Times must be aligned to 15-minute grid', 'timeInterval');
    }

    return new TimeInterval({ start, end });
  }

  get start(): Date {
    return this._value.start;
  }

  get end(): Date {
    return this._value.end;
  }

  get durationMinutes(): number {
    return (this._value.end.getTime() - this._value.start.getTime()) / (1000 * 60);
  }

  overlaps(other: TimeInterval): boolean {
    return this._value.start < other.end && other.start < this._value.end;
  }

  contains(date: Date): boolean {
    return date >= this._value.start && date < this._value.end;
  }

  touches(other: TimeInterval): boolean {
    return (
      this._value.end.getTime() === other.start.getTime() ||
      other.end.getTime() === this._value.start.getTime()
    );
  }
}
