import { BaseQuery } from '../cqrs/query';

export interface DiscoverSeatsParams {
  restaurantId: string;
  sectorId: string;
  date: string;
  partySize: number;
  duration: number;
  windowStart?: string;
  windowEnd?: string;
  limit?: number;
}

export class DiscoverSeatsQuery extends BaseQuery {
  constructor(public readonly params: DiscoverSeatsParams) {
    super('DiscoverSeats');
  }
}



