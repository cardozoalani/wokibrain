import { BaseQuery } from '../cqrs/query';

export class GetBookingQuery extends BaseQuery {
  constructor(public readonly bookingId: string) {
    super('GetBooking');
  }
}



