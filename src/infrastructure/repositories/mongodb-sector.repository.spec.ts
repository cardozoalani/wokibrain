import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { MongoDBSectorRepository } from './mongodb-sector.repository';
import { Sector } from '@domain/entities/sector.entity';

describe('MongoDBSectorRepository', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let repository: MongoDBSectorRepository;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('wokibrain_test');
    repository = new MongoDBSectorRepository(db.collection('sectors'));
    await db.collection('sectors').deleteMany({});
  });

  afterEach(async () => {
    try {
      if (client) {
        await client.close();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      // Ignore errors when closing client (may already be closed)
    }
  });

  it('should save and retrieve sector', async () => {
    const sector = Sector.create('S1', 'R1', 'Main Hall');
    await repository.save(sector);

    const found = await repository.findById('S1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('S1');
    expect(found?.restaurantId).toBe('R1');
  });

  it('should find sectors by restaurant id', async () => {
    const sector1 = Sector.create('S1', 'R1', 'Main Hall');
    const sector2 = Sector.create('S2', 'R1', 'Terrace');
    const sector3 = Sector.create('S3', 'R2', 'Private Room');

    await repository.save(sector1);
    await repository.save(sector2);
    await repository.save(sector3);

    const sectors = await repository.findByRestaurantId('R1');
    expect(sectors.length).toBe(2);
    expect(sectors.some((s) => s.id === 'S1')).toBe(true);
    expect(sectors.some((s) => s.id === 'S2')).toBe(true);
  });
});
