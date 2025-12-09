import { Collection } from 'mongodb';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';
import { BookingRepository } from '@domain/repositories/booking.repository';

interface BookingDocument {
  id: string;
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  partySize: number;
  interval: {
    start: Date;
    end: Date;
  };
  durationMinutes: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface IdempotencyDocument {
  key: string;
  bookingId: string;
  createdAt: Date;
}

export class MongoDBBookingRepository implements BookingRepository {
  constructor(
    private collection: Collection<BookingDocument>,
    private idempotencyCollection: Collection<IdempotencyDocument>
  ) {}

  async findById(id: string): Promise<Booking | null> {
    // Validate input to prevent injection risks
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }

    // Use explicit parameter to ensure safe query
    const doc = await this.collection.findOne({ id: id.trim() });
    return doc ? this.toDomain(doc) : null;
  }

  async findBySectorAndDate(sectorId: string, date: Date): Promise<Booking[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const docs = await this.collection
      .find({
        sectorId,
        'interval.start': { $gte: startOfDay, $lte: endOfDay },
        status: BookingStatus.CONFIRMED,
      })
      .toArray();

    return docs.map((doc) => this.toDomain(doc));
  }

  async findByTableAndDateRange(tableId: string, start: Date, end: Date): Promise<Booking[]> {
    const docs = await this.collection
      .find({
        tableIds: tableId,
        status: BookingStatus.CONFIRMED,
        $or: [
          { 'interval.start': { $gte: start, $lt: end } },
          { 'interval.end': { $gt: start, $lte: end } },
          { 'interval.start': { $lte: start }, 'interval.end': { $gte: end } },
        ],
      })
      .toArray();

    return docs.map((doc) => this.toDomain(doc));
  }

  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    const idempotency = await this.idempotencyCollection.findOne({ key });
    if (!idempotency) return null;

    return this.findById(idempotency.bookingId);
  }

  async save(booking: Booking): Promise<void> {
    const doc = this.toDocument(booking);
    await this.collection.updateOne({ id: booking.id }, { $set: doc }, { upsert: true });
  }

  async saveWithIdempotencyKey(booking: Booking, idempotencyKey: string): Promise<void> {
    await this.save(booking);

    await this.idempotencyCollection.updateOne(
      { key: idempotencyKey },
      {
        $set: {
          key: idempotencyKey,
          bookingId: booking.id,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  private toDomain(doc: BookingDocument): Booking {
    const interval = TimeInterval.create(new Date(doc.interval.start), new Date(doc.interval.end));
    const duration = Duration.create(doc.durationMinutes);

    return Booking.create(
      doc.id,
      doc.restaurantId,
      doc.sectorId,
      doc.tableIds,
      doc.partySize,
      interval,
      duration,
      doc.status,
      doc.createdAt,
      doc.updatedAt
    );
  }

  private toDocument(booking: Booking): BookingDocument {
    return {
      id: booking.id,
      restaurantId: booking.restaurantId,
      sectorId: booking.sectorId,
      tableIds: booking.tableIds,
      partySize: booking.partySize,
      interval: {
        start: booking.interval.start,
        end: booking.interval.end,
      },
      durationMinutes: booking.duration.minutes,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
