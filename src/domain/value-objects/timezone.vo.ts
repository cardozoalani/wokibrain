import { ValueObject } from '@shared/value-object';
import { ValidationError } from '@shared/errors';

export class Timezone extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(timezone: string): Timezone {
    if (!timezone || timezone.trim().length === 0) {
      throw new ValidationError('Timezone cannot be empty', 'timezone');
    }

    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new ValidationError(`Invalid timezone: ${timezone}`, 'timezone');
    }

    return new Timezone(timezone);
  }

  toZonedDate(date: Date): Date {
    const str = date.toLocaleString('en-US', { timeZone: this._value });
    return new Date(str);
  }
}
