import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisDistributedLock } from './distributed-lock.service';
import { RedisClient } from './redis-client';

describe('RedisDistributedLock', () => {
  let lockService: RedisDistributedLock;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      acquireLock: vi.fn(),
      releaseLock: vi.fn(),
      expire: vi.fn(),
    };

    lockService = new RedisDistributedLock(mockRedis as RedisClient);
  });

  describe('acquire', () => {
    it('should acquire lock successfully', async () => {
      mockRedis.acquireLock.mockResolvedValue(true);

      const acquired = await lockService.acquire('test-key', 10);

      expect(acquired).toBe(true);
      expect(mockRedis.acquireLock).toHaveBeenCalledWith('lock:test-key', 10);
    });

    it('should return false when lock cannot be acquired', async () => {
      mockRedis.acquireLock.mockResolvedValue(false);

      const acquired = await lockService.acquire('test-key', 10);

      expect(acquired).toBe(false);
    });
  });

  describe('release', () => {
    it('should release lock', async () => {
      await lockService.release('test-key');

      expect(mockRedis.releaseLock).toHaveBeenCalledWith('lock:test-key');
    });
  });

  describe('extend', () => {
    it('should extend lock TTL', async () => {
      await lockService.extend('test-key', 20);

      expect(mockRedis.expire).toHaveBeenCalledWith('lock:test-key', 20);
    });
  });

  describe('withLock', () => {
    it('should execute function with lock', async () => {
      mockRedis.acquireLock.mockResolvedValue(true);
      const fn = vi.fn().mockResolvedValue('result');

      const result = await lockService.withLock('test-key', fn, 10);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(mockRedis.releaseLock).toHaveBeenCalledWith('lock:test-key');
    });

    it('should release lock even if function throws', async () => {
      mockRedis.acquireLock.mockResolvedValue(true);
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(lockService.withLock('test-key', fn, 10)).rejects.toThrow('Test error');
      expect(mockRedis.releaseLock).toHaveBeenCalledWith('lock:test-key');
    });

    it('should throw error when lock cannot be acquired', async () => {
      mockRedis.acquireLock.mockResolvedValue(false);
      const fn = vi.fn();

      await expect(lockService.withLock('test-key', fn, 10)).rejects.toThrow(
        'Failed to acquire lock'
      );
      expect(fn).not.toHaveBeenCalled();
    });
  });
});



