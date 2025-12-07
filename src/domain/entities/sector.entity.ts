import { Entity } from '@shared/entity';

interface SectorProps {
  restaurantId: string;
  name: string;
}

export class Sector extends Entity<SectorProps> {
  private readonly _restaurantId: string;
  private readonly _name: string;

  private constructor(
    id: string,
    restaurantId: string,
    name: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._restaurantId = restaurantId;
    this._name = name;
  }

  static create(
    id: string,
    restaurantId: string,
    name: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Sector {
    return new Sector(id, restaurantId, name, createdAt, updatedAt);
  }

  get restaurantId(): string {
    return this._restaurantId;
  }

  get name(): string {
    return this._name;
  }

  toJSON() {
    return {
      id: this._id,
      restaurantId: this._restaurantId,
      name: this._name,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}



