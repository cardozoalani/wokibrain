import { BaseCommand } from '../cqrs/command';

export interface CancelBookingPayload {
  bookingId: string;
  reason?: string;
  cancelledBy?: string;
}

export class CancelBookingCommand extends BaseCommand {
  constructor(
    public readonly payload: CancelBookingPayload,
    metadata?: Record<string, unknown>
  ) {
    super('CancelBooking', metadata);
  }
}



