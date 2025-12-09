import { Collection } from 'mongodb';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { RestaurantRepository } from '@domain/repositories/restaurant.repository';

interface RestaurantDocument {
  id: string;
  name: string;
  timezone: string;
  windows: Array<{ start: string; end: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoDBRestaurantRepository implements RestaurantRepository {
  constructor(private collection: Collection<RestaurantDocument>) {}

  async findById(id: string): Promise<Restaurant | null> {
    // Validate input to prevent injection risks
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }

    // Use explicit parameter to ensure safe query
    const doc = await this.collection.findOne({ id: id.trim() });
    return doc ? this.toDomain(doc) : null;
  }

  async save(restaurant: Restaurant): Promise<void> {
    const doc = this.toDocument(restaurant);
    await this.collection.updateOne({ id: restaurant.id }, { $set: doc }, { upsert: true });
  }

  private toDomain(doc: RestaurantDocument): Restaurant {
    const timezone = Timezone.create(doc.timezone);
    const windows = doc.windows.map((w) => TimeWindow.create(w.start, w.end));

    return Restaurant.create(doc.id, doc.name, timezone, windows, doc.createdAt, doc.updatedAt);
  }

  private toDocument(restaurant: Restaurant): RestaurantDocument {
    return {
      id: restaurant.id,
      name: restaurant.name,
      timezone: restaurant.timezone.value,
      windows: restaurant.windows.map((w) => ({ start: w.start, end: w.end })),
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    };
  }
}
