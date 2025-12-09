import { Entity } from '@shared/entity';
import { CapacityRange } from '../value-objects/capacity-range.vo';

interface TableProps {
  sectorId: string;
  name: string;
  capacity: CapacityRange;
}

export class Table extends Entity<TableProps> {
  private readonly _sectorId: string;
  private readonly _name: string;
  private readonly _capacity: CapacityRange;

  private constructor(
    id: string,
    sectorId: string,
    name: string,
    capacity: CapacityRange,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._sectorId = sectorId;
    this._name = name;
    this._capacity = capacity;
  }

  static create(
    id: string,
    sectorId: string,
    name: string,
    capacity: CapacityRange,
    createdAt?: Date,
    updatedAt?: Date
  ): Table {
    return new Table(id, sectorId, name, capacity, createdAt, updatedAt);
  }

  get sectorId(): string {
    return this._sectorId;
  }

  get name(): string {
    return this._name;
  }

  get capacity(): CapacityRange {
    return this._capacity;
  }

  canAccommodate(partySize: number): boolean {
    return this._capacity.canAccommodate(partySize);
  }

  toJSON() {
    return {
      id: this._id,
      sectorId: this._sectorId,
      name: this._name,
      minSize: this._capacity.min,
      maxSize: this._capacity.max,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
