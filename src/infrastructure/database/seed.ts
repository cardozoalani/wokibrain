import { MongoDBClient } from './mongodb.client';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Sector } from '@domain/entities/sector.entity';
import { Table } from '@domain/entities/table.entity';
import { Booking, BookingStatus } from '@domain/entities/booking.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';
import { TimeInterval } from '@domain/value-objects/time-interval.vo';
import { Duration } from '@domain/value-objects/duration.vo';
import { MongoDBRestaurantRepository } from '../repositories/mongodb-restaurant.repository';
import { MongoDBSectorRepository } from '../repositories/mongodb-sector.repository';
import { MongoDBTableRepository } from '../repositories/mongodb-table.repository';
import { MongoDBBookingRepository } from '../repositories/mongodb-booking.repository';

export async function seedDatabase(client: MongoDBClient): Promise<void> {
  const db = client.getDb();

  const restaurantRepo = new MongoDBRestaurantRepository(db.collection('restaurants'));
  const sectorRepo = new MongoDBSectorRepository(db.collection('sectors'));
  const tableRepo = new MongoDBTableRepository(db.collection('tables'));
  const bookingRepo = new MongoDBBookingRepository(
    db.collection('bookings'),
    db.collection('idempotency')
  );

  const baseDate = new Date('2025-10-22T00:00:00-03:00');

  const restaurant = Restaurant.create(
    'R1',
    'Bistro Central',
    Timezone.create('America/Argentina/Buenos_Aires'),
    [TimeWindow.create('12:00', '16:00'), TimeWindow.create('20:00', '23:45')],
    baseDate,
    baseDate
  );
  await restaurantRepo.save(restaurant);

  const sector = Sector.create('S1', 'R1', 'Main Hall', baseDate, baseDate);
  await sectorRepo.save(sector);

  const tables = [
    Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 2), baseDate, baseDate),
    Table.create('T2', 'S1', 'Table 2', CapacityRange.create(2, 4), baseDate, baseDate),
    Table.create('T3', 'S1', 'Table 3', CapacityRange.create(2, 4), baseDate, baseDate),
    Table.create('T4', 'S1', 'Table 4', CapacityRange.create(4, 6), baseDate, baseDate),
    Table.create('T5', 'S1', 'Table 5', CapacityRange.create(2, 2), baseDate, baseDate),
  ];

  for (const table of tables) {
    await tableRepo.save(table);
  }

  const bookingStart = new Date('2025-10-22T20:30:00-03:00');
  const bookingEnd = new Date('2025-10-22T21:15:00-03:00');
  const interval = TimeInterval.create(bookingStart, bookingEnd);
  const duration = Duration.create(45);

  const booking = Booking.create(
    'B1',
    'R1',
    'S1',
    ['T2'],
    3,
    interval,
    duration,
    BookingStatus.CONFIRMED,
    new Date('2025-10-22T18:00:00-03:00'),
    new Date('2025-10-22T18:00:00-03:00')
  );

  await bookingRepo.save(booking);
}
