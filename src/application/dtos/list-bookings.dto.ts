import { z } from 'zod';
import { BookingOutput } from './create-booking.dto';

export const ListBookingsInputSchema = z.object({
  restaurantId: z.string().min(1),
  sectorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ListBookingsInput = z.infer<typeof ListBookingsInputSchema>;

export interface ListBookingsOutput {
  date: string;
  bookings: BookingOutput[];
}
