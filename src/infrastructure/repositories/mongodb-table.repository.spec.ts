import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { MongoDBTableRepository } from './mongodb-table.repository';
import { Table } from '@domain/entities/table.entity';
import { CapacityRange } from '@domain/value-objects/capacity-range.vo';

describe('MongoDBTableRepository', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let repository: MongoDBTableRepository;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('wokibrain_test');
    repository = new MongoDBTableRepository(db.collection('tables'));
    await db.collection('tables').deleteMany({});
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

  it('should save and retrieve table', async () => {
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));
    await repository.save(table);

    const found = await repository.findById('T1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('T1');
    expect(found?.capacity.min).toBe(2);
    expect(found?.capacity.max).toBe(4);
  });

  it('should find tables by sector id', async () => {
    const table1 = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));
    const table2 = Table.create('T2', 'S1', 'Table 2', CapacityRange.create(2, 2));
    const table3 = Table.create('T3', 'S2', 'Table 3', CapacityRange.create(4, 6));

    await repository.save(table1);
    await repository.save(table2);
    await repository.save(table3);

    const tables = await repository.findBySectorId('S1');
    expect(tables.length).toBe(2);
    expect(tables.some((t) => t.id === 'T1')).toBe(true);
    expect(tables.some((t) => t.id === 'T2')).toBe(true);
  });

  it('should find tables by ids', async () => {
    const table1 = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));
    const table2 = Table.create('T2', 'S1', 'Table 2', CapacityRange.create(2, 2));
    const table3 = Table.create('T3', 'S1', 'Table 3', CapacityRange.create(4, 6));

    await repository.save(table1);
    await repository.save(table2);
    await repository.save(table3);

    const tables = await repository.findByIds(['T1', 'T3']);
    expect(tables.length).toBe(2);
    expect(tables.some((t) => t.id === 'T1')).toBe(true);
    expect(tables.some((t) => t.id === 'T3')).toBe(true);
  });
});
