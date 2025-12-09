export interface DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly occurredAt: Date;
  readonly payload: unknown;
  readonly metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  };
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly occurredAt: Date;
  readonly payload: unknown;
  readonly metadata?: Record<string, unknown>;

  constructor(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    version: number,
    payload: unknown,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = this.generateEventId();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventType = eventType;
    this.version = version;
    this.occurredAt = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
