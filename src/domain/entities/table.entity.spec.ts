import { describe, it, expect } from 'vitest';
import { Table } from './table.entity';
import { CapacityRange } from '../value-objects/capacity-range.vo';

describe('Table', () => {
  it('should create table', () => {
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));

    expect(table.id).toBe('T1');
    expect(table.sectorId).toBe('S1');
    expect(table.name).toBe('Table 1');
    expect(table.capacity.min).toBe(2);
    expect(table.capacity.max).toBe(4);
  });

  it('should check if table can accommodate party size', () => {
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));

    expect(table.canAccommodate(2)).toBe(true);
    expect(table.canAccommodate(3)).toBe(true);
    expect(table.canAccommodate(4)).toBe(true);
    expect(table.canAccommodate(1)).toBe(false);
    expect(table.canAccommodate(5)).toBe(false);
  });

  it('should serialize to JSON', () => {
    const table = Table.create('T1', 'S1', 'Table 1', CapacityRange.create(2, 4));
    const json = table.toJSON();

    expect(json.id).toBe('T1');
    expect(json.sectorId).toBe('S1');
    expect(json.name).toBe('Table 1');
    expect(json.minSize).toBe(2);
    expect(json.maxSize).toBe(4);
  });
});
