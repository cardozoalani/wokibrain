import { BaseQuery } from '../cqrs/query';

export interface ListBookingsParams {
  restaurantId: string;
  sectorId: string;
  date: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class ListBookingsQuery extends BaseQuery {
  constructor(public readonly params: ListBookingsParams) {
    super('ListBookings');
  }
}
