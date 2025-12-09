import { ValueObject } from '@shared/value-object';
import { ValidationError } from '@shared/errors';

interface TimeWindowProps {
  start: string;
  end: string;
}

export class TimeWindow extends ValueObject<TimeWindowProps> {
  private constructor(value: TimeWindowProps) {
    super(value);
  }

  static create(start: string, end: string): TimeWindow {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(start)) {
      throw new ValidationError(`Invalid start time format: ${start}`, 'start');
    }

    if (!timeRegex.test(end)) {
      throw new ValidationError(`Invalid end time format: ${end}`, 'end');
    }

    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes >= endMinutes) {
      throw new ValidationError('Start time must be before end time', 'timeWindow');
    }

    return new TimeWindow({ start, end });
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  get start(): string {
    return this._value.start;
  }

  get end(): string {
    return this._value.end;
  }

  contains(time: string): boolean {
    const timeMinutes = TimeWindow.timeToMinutes(time);
    const startMinutes = TimeWindow.timeToMinutes(this._value.start);
    const endMinutes = TimeWindow.timeToMinutes(this._value.end);

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  intersects(other: TimeWindow): boolean {
    const thisStart = TimeWindow.timeToMinutes(this._value.start);
    const thisEnd = TimeWindow.timeToMinutes(this._value.end);
    const otherStart = TimeWindow.timeToMinutes(other.start);
    const otherEnd = TimeWindow.timeToMinutes(other.end);

    return thisStart < otherEnd && otherStart < thisEnd;
  }
}
