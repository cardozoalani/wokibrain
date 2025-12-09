import { RedisClient } from '../caching/redis-client';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedRestaurants?: string[];
}

export class FeatureFlagService {
  private readonly prefix = 'feature_flag:';
  private localCache: Map<string, FeatureFlag> = new Map();

  constructor(private redis: RedisClient) {}

  async isEnabled(
    flagKey: string,
    context?: {
      userId?: string;
      restaurantId?: string;
    }
  ): Promise<boolean> {
    const flag = await this.getFlag(flagKey);

    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    if (context?.userId && flag.allowedUsers) {
      return flag.allowedUsers.includes(context.userId);
    }

    if (context?.restaurantId && flag.allowedRestaurants) {
      return flag.allowedRestaurants.includes(context.restaurantId);
    }

    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashString(context?.userId || context?.restaurantId || 'anonymous');
      const bucket = hash % 100;
      return bucket < flag.rolloutPercentage;
    }

    return true;
  }

  async setFlag(flag: FeatureFlag): Promise<void> {
    const key = this.getKey(flag.key);
    await this.redis.set(key, flag);
    this.localCache.set(flag.key, flag);
  }

  async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    const cached = this.localCache.get(flagKey);
    if (cached) return cached;

    const key = this.getKey(flagKey);
    const flag = await this.redis.get<FeatureFlag>(key);

    if (flag) {
      this.localCache.set(flagKey, flag);
    }

    return flag;
  }

  async deleteFlag(flagKey: string): Promise<void> {
    const key = this.getKey(flagKey);
    await this.redis.del(key);
    this.localCache.delete(flagKey);
  }

  private getKey(flagKey: string): string {
    return `${this.prefix}${flagKey}`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}



