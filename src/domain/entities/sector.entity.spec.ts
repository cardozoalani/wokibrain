import { describe, it, expect } from 'vitest';
import { Sector } from './sector.entity';

describe('Sector', () => {
  it('should create sector', () => {
    const sector = Sector.create('S1', 'R1', 'Main Hall');

    expect(sector.id).toBe('S1');
    expect(sector.restaurantId).toBe('R1');
    expect(sector.name).toBe('Main Hall');
  });

  it('should serialize to JSON', () => {
    const sector = Sector.create('S1', 'R1', 'Main Hall');
    const json = sector.toJSON();

    expect(json.id).toBe('S1');
    expect(json.restaurantId).toBe('R1');
    expect(json.name).toBe('Main Hall');
    expect(json.createdAt).toBeDefined();
    expect(json.updatedAt).toBeDefined();
  });
});



