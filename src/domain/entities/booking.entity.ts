import { Entity } from '@shared/entity';
import { TimeInterval } from '../value-objects/time-interval.vo';
import { Duration } from '../value-objects/duration.vo';
import { ConflictError } from '@shared/errors';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

interface BookingProps {
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  partySize: number;
  interval: TimeInterval;
  duration: Duration;
  status: BookingStatus;
}

export class Booking extends Entity<BookingProps> {
  private readonly _restaurantId: string;
  private readonly _sectorId: string;
  private readonly _tableIds: string[];
  private readonly _partySize: number;
  private readonly _interval: TimeInterval;
  private readonly _duration: Duration;
  private _status: BookingStatus;

  private constructor(
    id: string,
    restaurantId: string,
    sectorId: string,
    tableIds: string[],
    partySize: number,
    interval: TimeInterval,
    duration: Duration,
    status: BookingStatus,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._restaurantId = restaurantId;
    this._sectorId = sectorId;
    this._tableIds = tableIds;
    this._partySize = partySize;
    this._interval = interval;
    this._duration = duration;
    this._status = status;
  }

  static create(
    id: string,
    restaurantId: string,
    sectorId: string,
    tableIds: string[],
    partySize: number,
    interval: TimeInterval,
    duration: Duration,
    status: BookingStatus = BookingStatus.CONFIRMED,
    createdAt?: Date,
    updatedAt?: Date
  ): Booking {
    return new Booking(
      id,
      restaurantId,
      sectorId,
      tableIds,
      partySize,
      interval,
      duration,
      status,
      createdAt,
      updatedAt
    );
  }

  get restaurantId(): string {
    return this._restaurantId;
  }

  get sectorId(): string {
    return this._sectorId;
  }

  get tableIds(): string[] {
    return this._tableIds;
  }

  get partySize(): number {
    return this._partySize;
  }

  get interval(): TimeInterval {
    return this._interval;
  }

  get duration(): Duration {
    return this._duration;
  }

  get status(): BookingStatus {
    return this._status;
  }

  isConfirmed(): boolean {
    return this._status === BookingStatus.CONFIRMED;
  }

  cancel(): void {
    if (this._status === BookingStatus.CANCELLED) {
      throw new ConflictError('Booking is already cancelled');
    }
    this._status = BookingStatus.CANCELLED;
    this.touch();
  }

  conflictsWith(other: Booking): boolean {
    if (!this.isConfirmed() || !other.isConfirmed()) {
      return false;
    }

    const hasCommonTable = this._tableIds.some((id) => other.tableIds.includes(id));
    if (!hasCommonTable) {
      return false;
    }

    return this._interval.overlaps(other.interval);
  }

  toJSON() {
    return {
      id: this._id,
      restaurantId: this._restaurantId,
      sectorId: this._sectorId,
      tableIds: this._tableIds,
      partySize: this._partySize,
      start: this._interval.start.toISOString(),
      end: this._interval.end.toISOString(),
      durationMinutes: this._duration.minutes,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
