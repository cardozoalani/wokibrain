import { Collection } from 'mongodb';
import { Sector } from '@domain/entities/sector.entity';
import { SectorRepository } from '@domain/repositories/sector.repository';

interface SectorDocument {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoDBSectorRepository implements SectorRepository {
  constructor(private collection: Collection<SectorDocument>) {}

  async findById(id: string): Promise<Sector | null> {
    // Validate input to prevent injection risks
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }

    // Use explicit parameter to ensure safe query
    const doc = await this.collection.findOne({ id: id.trim() });
    return doc ? this.toDomain(doc) : null;
  }

  async findByRestaurantId(restaurantId: string): Promise<Sector[]> {
    const docs = await this.collection.find({ restaurantId }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(sector: Sector): Promise<void> {
    const doc = this.toDocument(sector);
    await this.collection.updateOne({ id: sector.id }, { $set: doc }, { upsert: true });
  }

  private toDomain(doc: SectorDocument): Sector {
    return Sector.create(doc.id, doc.restaurantId, doc.name, doc.createdAt, doc.updatedAt);
  }

  private toDocument(sector: Sector): SectorDocument {
    return {
      id: sector.id,
      restaurantId: sector.restaurantId,
      name: sector.name,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt,
    };
  }
}
