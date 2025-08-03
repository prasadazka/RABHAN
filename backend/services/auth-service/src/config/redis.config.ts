import Redis from 'ioredis';
import { config } from './environment.config';

export class RedisConfig {
  private static instance: RedisConfig;
  private client: Redis;

  private constructor() {
    if (config.env === 'development') {
      // Mock Redis for development
      this.client = null as any;
      return;
    }

    this.client = new Redis(config.redis.url, {
      keyPrefix: config.redis.prefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 2000,
      keepAlive: 10000
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });

    this.client.on('ready', () => {
      console.log('Redis ready');
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  public async connect(): Promise<void> {
    if (config.env === 'development') {
      console.log('Redis connection skipped in development mode');
      return;
    }
    await this.client.connect();
  }

  public async disconnect(): Promise<void> {
    if (config.env === 'development') {
      return;
    }
    await this.client.quit();
  }

  public async healthCheck(): Promise<boolean> {
    if (config.env === 'development') {
      console.log('Redis health check skipped in development mode');
      return true;
    }
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}