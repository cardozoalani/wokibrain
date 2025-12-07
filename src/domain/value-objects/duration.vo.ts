import { ValueObject } from '@shared/value-object';
import { ValidationError } from '@shared/errors';

export class Duration extends ValueObject<number> {
  private static readonly MIN_DURATION = 30;
  private static readonly MAX_DURATION = 180;
  private static readonly SLOT_MINUTES = 15;

  private constructor(minutes: number) {
    super(minutes);
  }

  static create(minutes: number): Duration {
    if (minutes < Duration.MIN_DURATION || minutes > Duration.MAX_DURATION) {
      throw new ValidationError(
        `Duration must be between ${Duration.MIN_DURATION} and ${Duration.MAX_DURATION} minutes`,
        'duration'
      );
    }

    if (minutes % Duration.SLOT_MINUTES !== 0) {
      throw new ValidationError(
        `Duration must be a multiple of ${Duration.SLOT_MINUTES} minutes`,
        'duration'
      );
    }

    return new Duration(minutes);
  }

  get minutes(): number {
    return this._value;
  }

  get slots(): number {
    return this._value / Duration.SLOT_MINUTES;
  }

  addTo(date: Date): Date {
    return new Date(date.getTime() + this._value * 60 * 1000);
  }
}



