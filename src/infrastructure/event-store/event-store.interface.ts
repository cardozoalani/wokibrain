import { DomainEvent } from '@domain/events/domain-event';

export interface EventStream {
  aggregateId: string;
  aggregateType: string;
  version: number;
  events: DomainEvent[];
}

export interface EventStoreOptions {
  fromVersion?: number;
  toVersion?: number;
  limit?: number;
}

export interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: unknown;
  createdAt: Date;
}

export interface EventStore {
  appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  getEvents(
    aggregateId: string,
    aggregateType: string,
    options?: EventStoreOptions
  ): Promise<DomainEvent[]>;

  getEventStream(aggregateId: string, aggregateType: string): Promise<EventStream>;

  getAllEvents(aggregateType?: string, options?: EventStoreOptions): Promise<DomainEvent[]>;

  saveSnapshot(snapshot: Snapshot): Promise<void>;

  getLatestSnapshot(aggregateId: string, aggregateType: string): Promise<Snapshot | null>;

  replay(
    aggregateType: string,
    fromVersion: number,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void>;
}



