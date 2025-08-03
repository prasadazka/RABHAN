import Redis from 'ioredis';
import { UserProfile, BNPLEligibility } from '../types';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private readonly prefix: string;
  private readonly defaultTTL: number;

  constructor() {
    this.prefix = process.env.REDIS_KEY_PREFIX || 'rabhan:user:';
    this.defaultTTL = parseInt(process.env.REDIS_TTL || '300', 10);

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '1', 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  // User profile caching
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const key = `${this.prefix}profile:${userId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error', error);
      return null; // Fail gracefully
    }
  }

  async setUserProfile(userId: string, profile: UserProfile, ttl?: number): Promise<void> {
    try {
      const key = `${this.prefix}profile:${userId}`;
      const value = JSON.stringify(profile);
      const actualTTL = ttl || this.defaultTTL;
      
      await this.redis.setex(key, actualTTL, value);
      logger.info('Profile cached successfully', { userId, ttl: actualTTL, profileId: profile.id });
    } catch (error) {
      logger.error('Cache set error', { userId, error: error.message });
      // Fail gracefully - cache is not critical
    }
  }

  async invalidateUserProfile(userId: string): Promise<void> {
    try {
      const key = `${this.prefix}profile:${userId}`;
      const result = await this.redis.del(key);
      logger.info('Cache invalidated for user profile', { userId, keysDeleted: result });
    } catch (error) {
      logger.error('Cache invalidate error', error);
    }
  }

  // BNPL eligibility caching
  async getBNPLEligibility(userId: string): Promise<BNPLEligibility | null> {
    try {
      const key = `${this.prefix}bnpl:${userId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error', error);
      return null;
    }
  }

  async setBNPLEligibility(
    userId: string, 
    eligibility: BNPLEligibility, 
    ttl: number = 3600
  ): Promise<void> {
    try {
      const key = `${this.prefix}bnpl:${userId}`;
      const value = JSON.stringify(eligibility);
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      logger.error('Cache set error', error);
    }
  }

  async invalidateBNPLEligibility(userId: string): Promise<void> {
    try {
      const key = `${this.prefix}bnpl:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache invalidate error', error);
    }
  }

  // Batch operations
  async invalidateUserData(userId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      pipeline.del(`${this.prefix}profile:${userId}`);
      pipeline.del(`${this.prefix}bnpl:${userId}`);
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Cache batch invalidate error', error);
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}