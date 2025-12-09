import { Collection, Db } from 'mongodb';
import { BookingProjection, BookingReadModel } from './booking-read-model';
import { DomainEvent } from '@domain/events/domain-event';
import { EventStore } from '../event-store/event-store.interface';

export class MongoDBBookingProjection implements BookingProjection {
  private collection: Collection<BookingReadModel>;

  constructor(
    private _db: Db,
    private eventStore: EventStore
  ) {
    this.collection = this._db.collection('bookings_read');
    this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex({ restaurantId: 1, sectorId: 1, start: 1 });
    await this.collection.createIndex({ status: 1 });
    await this.collection.createIndex({ guestEmail: 1 });
  }

  async project(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'BookingCreated':
        await this.handleBookingCreated(event);
        break;
      case 'BookingCancelled':
        await this.handleBookingCancelled(event);
        break;
      case 'BookingUpdated':
        await this.handleBookingUpdated(event);
        break;
    }
  }

  private async handleBookingCreated(event: DomainEvent): Promise<void> {
    const payload = event.payload as {
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
    };

    const readModel: BookingReadModel = {
      id: event.aggregateId,
      restaurantId: payload.restaurantId,
      sectorId: payload.sectorId,
      tableIds: payload.tableIds,
      partySize: payload.partySize,
      start: new Date(payload.start),
      end: new Date(payload.end),
      durationMinutes: payload.durationMinutes,
      status: 'CONFIRMED',
      guestName: payload.guestName,
      guestEmail: payload.guestEmail,
      guestPhone: payload.guestPhone,
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
      version: event.version,
    };

    await this.collection.updateOne({ id: readModel.id }, { $set: readModel }, { upsert: true });
  }

  private async handleBookingCancelled(event: DomainEvent): Promise<void> {
    await this.collection.updateOne(
      { id: event.aggregateId },
      {
        $set: {
          status: 'CANCELLED',
          updatedAt: event.occurredAt,
          version: event.version,
        },
      }
    );
  }

  private async handleBookingUpdated(event: DomainEvent): Promise<void> {
    const payload = event.payload as { changes: Record<string, unknown> };

    await this.collection.updateOne(
      { id: event.aggregateId },
      {
        $set: {
          ...payload.changes,
          updatedAt: event.occurredAt,
          version: event.version,
        },
      }
    );
  }

  async rebuild(): Promise<void> {
    await this.collection.deleteMany({});

    await this.eventStore.replay('Booking', 0, async (event) => {
      await this.project(event);
    });
  }

  async get(bookingId: string): Promise<BookingReadModel | null> {
    return await this.collection.findOne({ id: bookingId });
  }

  async list(filters: Record<string, unknown>): Promise<BookingReadModel[]> {
    return await this.collection.find(filters).toArray();
  }
}
