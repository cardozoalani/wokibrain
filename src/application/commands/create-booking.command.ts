import { BaseCommand } from '../cqrs/command';

export interface CreateBookingPayload {
  restaurantId: string;
  sectorId: string;
  partySize: number;
  durationMinutes: number;
  date: string;
  windowStart?: string;
  windowEnd?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export class CreateBookingCommand extends BaseCommand {
  constructor(
    public readonly payload: CreateBookingPayload,
    metadata?: Record<string, unknown>
  ) {
    super('CreateBooking', metadata);
  }
}
