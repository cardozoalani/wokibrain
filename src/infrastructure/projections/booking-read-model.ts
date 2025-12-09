export interface BookingReadModel {
  id: string;
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  partySize: number;
  start: Date;
  end: Date;
  durationMinutes: number;
  status: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface BookingProjection {
  project(event: unknown): Promise<void>;
  rebuild(): Promise<void>;
  get(bookingId: string): Promise<BookingReadModel | null>;
  list(filters: Record<string, unknown>): Promise<BookingReadModel[]>;
}
