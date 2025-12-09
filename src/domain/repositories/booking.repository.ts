import { Booking } from '../entities/booking.entity';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findBySectorAndDate(sectorId: string, date: Date): Promise<Booking[]>;
  findByTableAndDateRange(tableId: string, start: Date, end: Date): Promise<Booking[]>;
  findByIdempotencyKey(key: string): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
  saveWithIdempotencyKey(booking: Booking, idempotencyKey: string): Promise<void>;
  delete(id: string): Promise<void>;
}
