import { Entity } from '@shared/entity';
import { Timezone } from '../value-objects/timezone.vo';
import { TimeWindow } from '../value-objects/time-window.vo';

interface RestaurantProps {
  name: string;
  timezone: Timezone;
  windows?: TimeWindow[];
}

export class Restaurant extends Entity<RestaurantProps> {
  private readonly _name: string;
  private readonly _timezone: Timezone;
  private readonly _windows: TimeWindow[];

  private constructor(
    id: string,
    name: string,
    timezone: Timezone,
    windows: TimeWindow[],
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._timezone = timezone;
    this._windows = windows;
  }

  static create(
    id: string,
    name: string,
    timezone: Timezone,
    windows: TimeWindow[] = [],
    createdAt?: Date,
    updatedAt?: Date
  ): Restaurant {
    return new Restaurant(id, name, timezone, windows, createdAt, updatedAt);
  }

  get name(): string {
    return this._name;
  }

  get timezone(): Timezone {
    return this._timezone;
  }

  get windows(): TimeWindow[] {
    return this._windows;
  }

  hasServiceWindows(): boolean {
    return this._windows.length > 0;
  }

  isWithinServiceWindow(time: string): boolean {
    if (!this.hasServiceWindows()) {
      return true;
    }

    return this._windows.some((window) => window.contains(time));
  }

  toJSON() {
    return {
      id: this._id,
      name: this._name,
      timezone: this._timezone.value,
      windows: this._windows.map((w) => ({ start: w.start, end: w.end })),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}



