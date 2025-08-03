import Redis from 'ioredis';
import { config } from './environment.config';
import { logger } from '../utils/logger';

export class RedisConfig {
  private static instance: RedisConfig;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: config.redis.prefix,
      
      // Connection options
      connectTimeout: 10000,
      commandTimeout: 5000,
      
      // Retry strategy
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      
      // Reconnect on error
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis client error:', {
        error: err.message,
        stack: err.stack,
      });
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (ms: number) => {
      logger.info(`Redis client reconnecting in ${ms}ms`);
    });

    this.client.on('end', () => {
      logger.warn('Redis client connection ended');
      this.isConnected = false;
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      
      // Test the connection
      const pong = await this.client.ping();
      if (pong === 'PONG') {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      } else {
        throw new Error('Redis ping failed');
      }
    } catch (error) {
      logger.error('Redis connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Redis disconnection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      responseTime: number;
      memory?: any;
      stats?: any;
    };
  }> {
    const startTime = Date.now();
    
    try {
      const pong = await this.client.ping();
      const responseTime = Date.now() - startTime;
      
      if (pong === 'PONG') {
        const [memory, stats] = await Promise.all([
          this.client.memory('usage'),
          this.client.info('stats'),
        ]);
        
        return {
          status: 'healthy',
          details: {
            connected: this.isConnected,
            responseTime,
            memory,
            stats: this.parseRedisInfo(stats),
          },
        };
      } else {
        throw new Error('Redis ping failed');
      }
    } catch (error) {
      logger.error('Redis health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  // Document upload session management
  public async createUploadSession(
    sessionId: string,
    userId: string,
    metadata: any
  ): Promise<void> {
    const key = `upload_session:${sessionId}`;
    const data = {
      userId,
      metadata,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    
    await this.client.setex(key, 3600, JSON.stringify(data)); // 1 hour expiry
    logger.debug('Upload session created', { sessionId, userId });
  }

  public async getUploadSession(sessionId: string): Promise<any | null> {
    const key = `upload_session:${sessionId}`;
    const data = await this.client.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return null;
  }

  public async updateUploadSession(
    sessionId: string,
    updates: any
  ): Promise<void> {
    const key = `upload_session:${sessionId}`;
    const existingData = await this.getUploadSession(sessionId);
    
    if (existingData) {
      const updatedData = {
        ...existingData,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await this.client.setex(key, 3600, JSON.stringify(updatedData));
      logger.debug('Upload session updated', { sessionId, updates });
    }
  }

  public async deleteUploadSession(sessionId: string): Promise<void> {
    const key = `upload_session:${sessionId}`;
    await this.client.del(key);
    logger.debug('Upload session deleted', { sessionId });
  }

  // Document validation cache
  public async cacheValidationResult(
    fileHash: string,
    validationResult: any
  ): Promise<void> {
    const key = `validation:${fileHash}`;
    await this.client.setex(
      key,
      config.redis.keyExpiry,
      JSON.stringify(validationResult)
    );
    logger.debug('Validation result cached', { fileHash });
  }

  public async getValidationResult(fileHash: string): Promise<any | null> {
    const key = `validation:${fileHash}`;
    const data = await this.client.get(key);
    
    if (data) {
      logger.debug('Validation result retrieved from cache', { fileHash });
      return JSON.parse(data);
    }
    
    return null;
  }

  // Rate limiting for uploads
  public async checkRateLimit(
    userId: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${userId}`;
    const current = await this.client.get(key);
    
    if (!current) {
      await this.client.setex(key, Math.ceil(windowMs / 1000), '1');
      return {
        allowed: true,
        remainingRequests: maxRequests - 1,
        resetTime: Date.now() + windowMs,
      };
    }
    
    const count = parseInt(current, 10);
    
    if (count >= maxRequests) {
      const ttl = await this.client.ttl(key);
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + (ttl * 1000),
      };
    }
    
    await this.client.incr(key);
    return {
      allowed: true,
      remainingRequests: maxRequests - count - 1,
      resetTime: Date.now() + windowMs,
    };
  }

  // Document processing queue
  public async enqueueDocument(
    documentId: string,
    processingType: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const queueKey = `processing_queue:${processingType}`;
    const data = {
      documentId,
      priority,
      enqueuedAt: new Date().toISOString(),
    };
    
    const score = this.getPriorityScore(priority);
    await this.client.zadd(queueKey, score, JSON.stringify(data));
    
    logger.debug('Document enqueued for processing', {
      documentId,
      processingType,
      priority,
    });
  }

  public async dequeueDocument(
    processingType: string
  ): Promise<{
    documentId: string;
    priority: string;
    enqueuedAt: string;
  } | null> {
    const queueKey = `processing_queue:${processingType}`;
    const result = await this.client.zpopmin(queueKey);
    
    if (result.length >= 2) {
      const data = JSON.parse(result[1]);
      logger.debug('Document dequeued for processing', {
        documentId: data.documentId,
        processingType,
      });
      return data;
    }
    
    return null;
  }

  // Audit log caching
  public async cacheAuditEvent(
    eventId: string,
    eventData: any,
    ttl: number = 86400
  ): Promise<void> {
    const key = `audit_event:${eventId}`;
    await this.client.setex(key, ttl, JSON.stringify(eventData));
  }

  public async getAuditEvent(eventId: string): Promise<any | null> {
    const key = `audit_event:${eventId}`;
    const data = await this.client.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return null;
  }

  // Distributed locks for document processing
  public async acquireLock(
    lockKey: string,
    ttl: number = 300
  ): Promise<boolean> {
    const key = `lock:${lockKey}`;
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    
    if (result === 'OK') {
      logger.debug('Lock acquired', { lockKey, ttl });
      return true;
    }
    
    return false;
  }

  public async releaseLock(lockKey: string): Promise<void> {
    const key = `lock:${lockKey}`;
    await this.client.del(key);
    logger.debug('Lock released', { lockKey });
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const parsed: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return parsed;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}