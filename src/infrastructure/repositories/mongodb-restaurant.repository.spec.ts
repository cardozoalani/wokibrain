import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db, Collection } from 'mongodb';
import { MongoDBRestaurantRepository } from './mongodb-restaurant.repository';
import { Restaurant } from '@domain/entities/restaurant.entity';
import { Timezone } from '@domain/value-objects/timezone.vo';
import { TimeWindow } from '@domain/value-objects/time-window.vo';

describe('MongoDBRestaurantRepository', () => {
  let client: MongoClient;
  let db: Db;
  let repository: MongoDBRestaurantRepository;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wokibrain_test';

  beforeEach(async () => {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('wokibrain_test');
    repository = new MongoDBRestaurantRepository(db.collection('restaurants'));
    await db.collection('restaurants').deleteMany({});
  });

  afterEach(async () => {
    try {
      if (client) {
        await client.close(true);
      }
    } catch (error) {
      // Ignore errors when closing client (may already be closed)
    }
  });

  it('should save and retrieve restaurant', async () => {
    const restaurant = Restaurant.create(
      'R1',
      'Bistro Central',
      Timezone.create('America/Argentina/Buenos_Aires'),
      [TimeWindow.create('20:00', '23:45')]
    );

    await repository.save(restaurant);

    const found = await repository.findById('R1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('R1');
    expect(found?.name).toBe('Bistro Central');
    expect(found?.windows).toHaveLength(1);
  });

  it('should return null for non-existent restaurant', async () => {
    const found = await repository.findById('NONEXISTENT');
    expect(found).toBeNull();
  });
});
