import { RedisClient } from './redis-client';

export interface DistributedLock {
  acquire(key: string, ttlSeconds?: number): Promise<boolean>;
  release(key: string): Promise<void>;
  extend(key: string, ttlSeconds: number): Promise<void>;
  withLock<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}

export class RedisDistributedLock implements DistributedLock {
  private readonly lockPrefix = 'lock:';

  constructor(private redis: RedisClient) {}

  async acquire(key: string, ttlSeconds: number = 10): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    return await this.redis.acquireLock(lockKey, ttlSeconds);
  }

  async release(key: string): Promise<void> {
    const lockKey = this.getLockKey(key);
    await this.redis.releaseLock(lockKey);
  }

  async extend(key: string, ttlSeconds: number): Promise<void> {
    const lockKey = this.getLockKey(key);
    await this.redis.expire(lockKey, ttlSeconds);
  }

  async withLock<T>(key: string, fn: () => Promise<T>, ttlSeconds: number = 10): Promise<T> {
    const acquired = await this.acquire(key, ttlSeconds);

    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }

  private getLockKey(key: string): string {
    return `${this.lockPrefix}${key}`;
  }
}



