import { RedisClient } from './redis-client';

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  remember<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}

export class RedisCacheService implements CacheService {
  private readonly cachePrefix = 'cache:';
  private readonly defaultTTL = 300;

  constructor(private redis: RedisClient) {}

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);
    return await this.redis.get<T>(cacheKey);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    await this.redis.set(cacheKey, value, ttlSeconds || this.defaultTTL);
  }

  async del(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    await this.redis.del(cacheKey);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const cachePattern = this.getCacheKey(pattern);
    const client = this.redis.getClient();
    const keys = await client.keys(cachePattern);

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  async remember<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, ttlSeconds);

    return value;
  }

  private getCacheKey(key: string): string {
    return `${this.cachePrefix}${key}`;
  }
}
