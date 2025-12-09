import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryQueryBus } from './query-bus.impl';
import { Query } from './query';

describe('InMemoryQueryBus', () => {
  let queryBus: InMemoryQueryBus;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    queryBus = new InMemoryQueryBus(mockLogger);
  });

  it('should execute query with registered handler', async () => {
    const query = {
      queryId: 'q-1',
      queryType: 'GetBooking',
    } as Query;

    const handler = {
      handle: vi.fn().mockResolvedValue({ id: 'B1' }),
    };

    queryBus.register('GetBooking', handler);

    const result = await queryBus.execute(query);

    expect(result).toEqual({ id: 'B1' });
    expect(handler.handle).toHaveBeenCalledWith(query);
  });

  it('should throw error for unregistered query', async () => {
    const query = {
      queryId: 'q-1',
      queryType: 'UnknownQuery',
    } as Query;

    await expect(queryBus.execute(query)).rejects.toThrow('No handler registered');
  });

  it('should throw error when registering duplicate handler', () => {
    const handler1 = { handle: vi.fn() };
    const handler2 = { handle: vi.fn() };

    queryBus.register('GetBooking', handler1);

    expect(() => {
      queryBus.register('GetBooking', handler2);
    }).toThrow('Handler already registered');
  });
});
