import { Collection } from 'mongodb';
import { Table } from '@domain/entities/table.entity';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';
import { TableRepository } from '@domain/repositories/table.repository';

interface TableDocument {
  id: string;
  sectorId: string;
  name: string;
  minSize: number;
  maxSize: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoDBTableRepository implements TableRepository {
  constructor(private collection: Collection<TableDocument>) {}

  async findById(id: string): Promise<Table | null> {
    // Validate input to prevent injection risks
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }

    // Use explicit parameter to ensure safe query
    const doc = await this.collection.findOne({ id: id.trim() });
    return doc ? this.toDomain(doc) : null;
  }

  async findBySectorId(sectorId: string): Promise<Table[]> {
    const docs = await this.collection.find({ sectorId }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByIds(ids: string[]): Promise<Table[]> {
    const docs = await this.collection.find({ id: { $in: ids } }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(table: Table): Promise<void> {
    const doc = this.toDocument(table);
    await this.collection.updateOne({ id: table.id }, { $set: doc }, { upsert: true });
  }

  private toDomain(doc: TableDocument): Table {
    const capacity = CapacityRange.create(doc.minSize, doc.maxSize);
    return Table.create(doc.id, doc.sectorId, doc.name, capacity, doc.createdAt, doc.updatedAt);
  }

  private toDocument(table: Table): TableDocument {
    return {
      id: table.id,
      sectorId: table.sectorId,
      name: table.name,
      minSize: table.capacity.min,
      maxSize: table.capacity.max,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };
  }
}



