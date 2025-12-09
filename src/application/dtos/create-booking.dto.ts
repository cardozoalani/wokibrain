import { z } from 'zod';

export const CreateBookingInputSchema = z.object({
  restaurantId: z.string().min(1),
  sectorId: z.string().min(1),
  partySize: z.number().int().positive(),
  durationMinutes: z.number().int().positive().multipleOf(15),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowStart: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  windowEnd: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

export interface BookingOutput {
  id: string;
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  partySize: number;
  start: string;
  end: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
