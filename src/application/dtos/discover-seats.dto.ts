import { z } from 'zod';

export const DiscoverSeatsInputSchema = z.object({
  restaurantId: z.string().min(1),
  sectorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().positive(),
  duration: z.number().int().positive().multipleOf(15),
  windowStart: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  windowEnd: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export type DiscoverSeatsInput = z.infer<typeof DiscoverSeatsInputSchema>;

export interface CandidateOutput {
  kind: 'single' | 'combo';
  tableIds: string[];
  start: string;
  end: string;
  score?: number;
}

export interface DiscoverSeatsOutput {
  slotMinutes: number;
  durationMinutes: number;
  candidates: CandidateOutput[];
}
