import { BaseDomainEvent } from './domain-event';

export class BookingCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    payload: {
      restaurantId: string;
      sectorId: string;
      tableIds: string[];
      partySize: number;
      start: Date;
      end: Date;
      durationMinutes: number;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
    },
    metadata?: Record<string, unknown>
  ) {
    super(aggregateId, 'Booking', 'BookingCreated', version, payload, metadata);
  }
}

export class BookingCancelledEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    payload: {
      reason?: string;
      cancelledBy?: string;
    },
    metadata?: Record<string, unknown>
  ) {
    super(aggregateId, 'Booking', 'BookingCancelled', version, payload, metadata);
  }
}

export class BookingUpdatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    payload: {
      changes: Record<string, unknown>;
    },
    metadata?: Record<string, unknown>
  ) {
    super(aggregateId, 'Booking', 'BookingUpdated', version, payload, metadata);
  }
}

export class BookingConfirmedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    payload: {
      confirmedAt: Date;
      confirmedBy?: string;
    },
    metadata?: Record<string, unknown>
  ) {
    super(aggregateId, 'Booking', 'BookingConfirmed', version, payload, metadata);
  }
}

export class TableAssignedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    payload: {
      tableIds: string[];
      assignedAt: Date;
    },
    metadata?: Record<string, unknown>
  ) {
    super(aggregateId, 'Booking', 'TableAssigned', version, payload, metadata);
  }
}
