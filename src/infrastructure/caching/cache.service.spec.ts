import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCacheService } from './cache.service';
import { RedisClient } from './redis-client';

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getClient: vi.fn(),
    };

    cacheService = new RedisCacheService(mockRedis as RedisClient);
  });

  describe('get and set', () => {
    it('should get and set values', async () => {
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValue(value);

      await cacheService.set('test-key', value, 60);
      const result = await cacheService.get('test-key');

      expect(result).toEqual(value);
      expect(mockRedis.set).toHaveBeenCalledWith('cache:test-key', value, 60);
      expect(mockRedis.get).toHaveBeenCalledWith('cache:test-key');
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('test-key', 'value');

      expect(mockRedis.set).toHaveBeenCalledWith('cache:test-key', 'value', 300);
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await cacheService.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:test-key');
    });
  });

  describe('remember', () => {
    it('should return cached value if exists', async () => {
      const cached = { data: 'cached' };
      mockRedis.get.mockResolvedValue(cached);
      const fn = vi.fn();

      const result = await cacheService.remember('test-key', fn);

      expect(result).toEqual(cached);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result if not cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      const fn = vi.fn().mockResolvedValue({ data: 'new' });

      const result = await cacheService.remember('test-key', fn, 60);

      expect(result).toEqual({ data: 'new' });
      expect(fn).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith('cache:test-key', { data: 'new' }, 60);
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching pattern', async () => {
      const mockClient = {
        keys: vi.fn().mockResolvedValue(['cache:key1', 'cache:key2']),
        del: vi.fn().mockResolvedValue(2),
      };
      mockRedis.getClient.mockReturnValue(mockClient);

      await cacheService.invalidatePattern('key*');

      expect(mockClient.keys).toHaveBeenCalledWith('cache:key*');
      expect(mockClient.del).toHaveBeenCalledWith('cache:key1', 'cache:key2');
    });
  });
});
