import { Collection, Db } from 'mongodb';
import { DomainEvent } from '@domain/events/domain-event';
import {
  EventStore,
  EventStream,
  EventStoreOptions,
  Snapshot,
} from './event-store.interface';

interface EventDocument {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  occurredAt: Date;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

interface SnapshotDocument {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: unknown;
  createdAt: Date;
}

export class MongoDBEventStore implements EventStore {
  private eventsCollection: Collection<EventDocument>;
  private snapshotsCollection: Collection<SnapshotDocument>;

  constructor(db: Db) {
    this.eventsCollection = db.collection('events');
    this.snapshotsCollection = db.collection('snapshots');
    this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    await this.eventsCollection.createIndex(
      { aggregateId: 1, aggregateType: 1, version: 1 },
      { unique: true }
    );
    await this.eventsCollection.createIndex({ aggregateId: 1, version: 1 });
    await this.eventsCollection.createIndex({ aggregateType: 1, occurredAt: 1 });
    await this.eventsCollection.createIndex({ eventType: 1 });

    await this.snapshotsCollection.createIndex(
      { aggregateId: 1, aggregateType: 1, version: -1 },
      { unique: true }
    );
  }

  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    const latestEvent = await this.eventsCollection.findOne(
      { aggregateId, aggregateType },
      { sort: { version: -1 } }
    );

    const currentVersion = latestEvent?.version ?? 0;

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, but current is ${currentVersion}`
      );
    }

    const documents = events.map((event) => this.toDocument(event));

    try {
      await this.eventsCollection.insertMany(documents, { ordered: true });
    } catch (error) {
      throw new Error(`Failed to append events: ${(error as Error).message}`);
    }
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
    options: EventStoreOptions = {}
  ): Promise<DomainEvent[]> {
    const query: Record<string, unknown> = { aggregateId, aggregateType };

    if (options.fromVersion !== undefined) {
      query.version = { $gte: options.fromVersion };
    }

    if (options.toVersion !== undefined) {
      query.version = { ...(query.version || {}), $lte: options.toVersion };
    }

    const cursor = this.eventsCollection
      .find(query)
      .sort({ version: 1 })
      .limit(options.limit || 0);

    const documents = await cursor.toArray();
    return documents.map((doc) => this.toDomainEvent(doc));
  }

  async getEventStream(aggregateId: string, aggregateType: string): Promise<EventStream> {
    const events = await this.getEvents(aggregateId, aggregateType);

    const version = events.length > 0 ? events[events.length - 1].version : 0;

    return {
      aggregateId,
      aggregateType,
      version,
      events,
    };
  }

  async getAllEvents(aggregateType?: string, options: EventStoreOptions = {}): Promise<DomainEvent[]> {
    const query: Record<string, unknown> = aggregateType ? { aggregateType } : {};

    const cursor = this.eventsCollection
      .find(query)
      .sort({ occurredAt: 1 })
      .limit(options.limit || 0);

    const documents = await cursor.toArray();
    return documents.map((doc) => this.toDomainEvent(doc));
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    await this.snapshotsCollection.updateOne(
      {
        aggregateId: snapshot.aggregateId,
        aggregateType: snapshot.aggregateType,
        version: snapshot.version,
      },
      { $set: snapshot },
      { upsert: true }
    );
  }

  async getLatestSnapshot(aggregateId: string, aggregateType: string): Promise<Snapshot | null> {
    const doc = await this.snapshotsCollection.findOne(
      { aggregateId, aggregateType },
      { sort: { version: -1 } }
    );

    return doc as Snapshot | null;
  }

  async replay(
    aggregateType: string,
    fromVersion: number,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    const cursor = this.eventsCollection
      .find({
        aggregateType,
        version: { $gte: fromVersion },
      })
      .sort({ version: 1 });

    for await (const doc of cursor) {
      const event = this.toDomainEvent(doc);
      await handler(event);
    }
  }

  private toDocument(event: DomainEvent): EventDocument {
    return {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      version: event.version,
      occurredAt: event.occurredAt,
      payload: event.payload,
      metadata: event.metadata,
    };
  }

  private toDomainEvent(doc: EventDocument): DomainEvent {
    return {
      eventId: doc.eventId,
      aggregateId: doc.aggregateId,
      aggregateType: doc.aggregateType,
      eventType: doc.eventType,
      version: doc.version,
      occurredAt: doc.occurredAt,
      payload: doc.payload,
      metadata: doc.metadata,
    };
  }
}

