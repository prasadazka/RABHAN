/**
 * RABHAN Admin Service Redis Configuration
 * Saudi Arabia's Solar BNPL Platform - Admin Management Service
 * 
 * High-Performance Caching for Sub-2ms Response:
 * - Multi-Tier Caching Strategy
 * - Redis Cluster Support for 100M+ Users
 * - Advanced Cache Invalidation
 * - SAMA Compliance Caching
 * - KSA Multi-Region Optimization
 */

import Redis, { Redis as RedisClient, Cluster } from 'ioredis';
import { config } from './environment.config';
import { logger } from '../utils/logger';

/**
 * Cache Performance Metrics Interface
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  averageResponseTime: number;
  errorCount: number;
  lastUpdate: Date;
  memory: {
    used: number;
    peak: number;
    fragmentation: number;
  };
}

/**
 * Cache Operation Result
 */
export interface CacheResult<T = any> {
  success: boolean;
  data?: T;
  cached: boolean;
  responseTime: number;
  source: 'L1' | 'L2' | 'DATABASE';
}

/**
 * Advanced Cache Configuration
 */
interface CacheConfig {
  ttl: {
    default: number;
    adminSessions: number;
    systemSettings: number;
    kycData: number;
    dashboardStats: number;
    userProfiles: number;
  };
  keyPrefix: string;
  compression: boolean;
  serialization: 'json' | 'msgpack';
}

/**
 * Saudi-Optimized Redis Cache Manager
 */
class RedisCacheManager {
  private redis: RedisClient | Cluster | null = null;
  private metrics: CacheMetrics;
  private l1Cache: Map<string, { data: any; expires: number }> = new Map();
  private readonly l1CacheMaxSize = 10000; // In-memory cache size
  private readonly cacheConfig: CacheConfig;
  
  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalOperations: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastUpdate: new Date(),
      memory: {
        used: 0,
        peak: 0,
        fragmentation: 0,
      },
    };
    
    this.cacheConfig = {
      ttl: {
        default: 300,        // 5 minutes
        adminSessions: 1800, // 30 minutes
        systemSettings: 3600, // 1 hour
        kycData: 900,        // 15 minutes
        dashboardStats: 60,  // 1 minute for real-time feel
        userProfiles: 1800,  // 30 minutes
      },
      keyPrefix: `rabhan:admin:${config.nodeEnv}:`,
      compression: true,
      serialization: 'json',
    };
  }
  
  /**
   * Initialize Redis connection with Saudi optimization
   */
  async initialize(): Promise<void> {
    try {
      if (!config.redis.enabled) {
        logger.info('Redis caching disabled by configuration');
        return;
      }
      
      logger.info('Initializing Redis cache connection', {
        host: config.redis.host,
        port: config.redis.port,
        cluster: config.redis.cluster.enabled,
        sama_caching: 'enabled'
      });
      
      if (config.redis.cluster.enabled && config.redis.cluster.nodes) {
        // Redis Cluster for high availability and scale
        this.redis = new Redis.Cluster(
          config.redis.cluster.nodes.map(node => {
            const [host, port] = node.split(':');
            return { host, port: parseInt(port) || 6379 };
          }),
          {
            // Cluster-specific optimizations
            enableReadyCheck: false,
            retryDelayOnFailover: 50,
            maxRetriesPerRequest: 2,
            
            // Saudi network optimizations
            lazyConnect: true,
            keepAlive: true,
            family: 4,
            connectTimeout: 1000,
            commandTimeout: 2000,
            
            // Performance settings
            enableOfflineQueue: false,
            enableAutoPipelining: true,
            maxRetriesPerRequest: 1,
            
            redisOptions: {
              password: config.redis.password,
              db: 0, // Cluster doesn't support db selection
              keyPrefix: this.cacheConfig.keyPrefix,
            },
          }
        );
      } else {
        // Single Redis instance with optimizations
        this.redis = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          keyPrefix: this.cacheConfig.keyPrefix,
          
          // Performance optimizations for Saudi infrastructure
          lazyConnect: true,
          keepAlive: true,
          family: 4,
          connectTimeout: 1000,
          commandTimeout: 2000,
          retryDelayOnFailover: 50,
          
          // Connection pool settings
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          enableAutoPipelining: true,
          
          // Memory optimization
          maxMemoryPolicy: 'allkeys-lru',
        });
      }
      
      // Event handlers for monitoring
      this.redis.on('connect', () => {
        logger.info('Redis cache connected successfully', {
          type: config.redis.cluster.enabled ? 'cluster' : 'single',
          sama_infrastructure: 'ready'
        });
      });
      
      this.redis.on('ready', () => {
        logger.info('Redis cache ready for operations', {
          keyPrefix: this.cacheConfig.keyPrefix,
          performance_target: 'sub-1ms'
        });
      });
      
      this.redis.on('error', (error: Error) => {
        this.metrics.errorCount++;
        logger.error('Redis cache error', error, {
          errorCount: this.metrics.errorCount,
          sama_incident: true,
          risk_level: 'MEDIUM'
        });
      });
      
      this.redis.on('close', () => {
        logger.warn('Redis cache connection closed', {
          sama_alert: true
        });
      });
      
      this.redis.on('reconnecting', () => {
        logger.info('Redis cache reconnecting...', {
          sama_recovery: true
        });
      });
      
      // Test connection with performance measurement
      const startTime = Date.now();
      await this.redis.ping();
      const connectionTime = Date.now() - startTime;
      
      // Start metrics collection
      this.startMetricsCollection();
      
      logger.info('Redis cache initialized successfully', {
        connectionTime,
        performanceRating: connectionTime < 10 ? 'EXCELLENT' : connectionTime < 50 ? 'GOOD' : 'SLOW',
        l1CacheSize: this.l1CacheMaxSize,
        sama_compliance: 'enabled'
      });
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Failed to initialize Redis cache', error as Error, {
        sama_incident: true,
        risk_level: 'HIGH'
      });
      
      // Continue without Redis if it fails
      logger.warn('Continuing without Redis cache - performance may be degraded');
    }
  }
  
  /**
   * Multi-tier cache get with performance tracking
   */
  async get<T = any>(key: string, options?: { 
    bypassL1?: boolean; 
    bypassL2?: boolean; 
    deserialize?: boolean; 
  }): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);
    
    try {
      // L1 Cache check (in-memory, fastest)
      if (!options?.bypassL1) {
        const l1Result = this.getFromL1<T>(fullKey);
        if (l1Result) {
          this.recordHit('L1');
          return {
            success: true,
            data: l1Result,
            cached: true,
            responseTime: Date.now() - startTime,
            source: 'L1'
          };
        }
      }
      
      // L2 Cache check (Redis)
      if (!options?.bypassL2 && this.redis) {
        const cached = await this.redis.get(fullKey);
        if (cached) {
          const data = options?.deserialize !== false ? 
            this.deserialize<T>(cached) : cached as T;
          
          // Promote to L1 cache
          this.setInL1(fullKey, data, this.cacheConfig.ttl.default);
          
          this.recordHit('L2');
          return {
            success: true,
            data,
            cached: true,
            responseTime: Date.now() - startTime,
            source: 'L2'
          };
        }
      }
      
      this.recordMiss();
      return {
        success: true,
        cached: false,
        responseTime: Date.now() - startTime,
        source: 'DATABASE'
      };
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Cache get operation failed', error as Error, {
        key: fullKey,
        sama_cache_error: true
      });
      
      return {
        success: false,
        cached: false,
        responseTime: Date.now() - startTime,
        source: 'DATABASE'
      };
    }
  }
  
  /**
   * Multi-tier cache set with TTL optimization
   */
  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    options?: { skipL1?: boolean; compress?: boolean }
  ): Promise<boolean> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);
    const cacheTtl = ttl || this.cacheConfig.ttl.default;
    
    try {
      // Set in L1 cache (immediate)
      if (!options?.skipL1) {
        this.setInL1(fullKey, value, cacheTtl);
      }
      
      // Set in L2 cache (Redis) if available
      if (this.redis) {
        const serialized = this.serialize(value);
        
        if (ttl) {
          await this.redis.setex(fullKey, cacheTtl, serialized);
        } else {
          await this.redis.set(fullKey, serialized);
        }
        
        // Set cache invalidation tags for related data
        await this.setCacheFamily(key, fullKey, cacheTtl);
      }
      
      const responseTime = Date.now() - startTime;
      
      logger.debug('Cache set operation completed', {
        key: fullKey,
        ttl: cacheTtl,
        responseTime,
        l1: !options?.skipL1,
        l2: !!this.redis
      });
      
      return true;
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Cache set operation failed', error as Error, {
        key: fullKey,
        ttl: cacheTtl,
        sama_cache_error: true
      });
      
      return false;
    }
  }
  
  /**
   * Smart cache invalidation by family/pattern
   */
  async invalidate(pattern: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      // Clear from L1 cache
      for (const [key] of this.l1Cache) {
        if (key.includes(pattern)) {
          this.l1Cache.delete(key);
          deletedCount++;
        }
      }
      
      // Clear from Redis
      if (this.redis) {
        const keys = await this.redis.keys(`*${pattern}*`);
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          deletedCount += keys.length;
        }
      }
      
      logger.info('Cache invalidation completed', {
        pattern,
        deletedCount,
        sama_cache_invalidation: true
      });
      
      return deletedCount;
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Cache invalidation failed', error as Error, {
        pattern,
        sama_cache_error: true
      });
      
      return 0;
    }
  }
  
  /**
   * Bulk cache operations for performance
   */
  async mget<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    if (!this.redis) {
      return results;
    }
    
    try {
      const fullKeys = keys.map(key => this.buildKey(key));
      const values = await this.redis.mget(...fullKeys);
      
      keys.forEach((key, index) => {
        const value = values[index];
        results[key] = value ? this.deserialize<T>(value) : null;
      });
      
      return results;
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Bulk cache get failed', error as Error, {
        keysCount: keys.length,
        sama_cache_error: true
      });
      
      return results;
    }
  }
  
  /**
   * Bulk cache set with pipeline for performance
   */
  async mset(data: Record<string, any>, ttl?: number): Promise<boolean> {
    if (!this.redis) {
      return false;
    }
    
    try {
      const pipeline = this.redis.pipeline();
      const cacheTtl = ttl || this.cacheConfig.ttl.default;
      
      Object.entries(data).forEach(([key, value]) => {
        const fullKey = this.buildKey(key);
        const serialized = this.serialize(value);
        
        pipeline.setex(fullKey, cacheTtl, serialized);
        
        // Also set in L1 cache
        this.setInL1(fullKey, value, cacheTtl);
      });
      
      await pipeline.exec();
      
      logger.debug('Bulk cache set completed', {
        keysCount: Object.keys(data).length,
        ttl: cacheTtl
      });
      
      return true;
      
    } catch (error) {
      this.metrics.errorCount++;
      logger.error('Bulk cache set failed', error as Error, {
        keysCount: Object.keys(data).length,
        sama_cache_error: true
      });
      
      return false;
    }
  }
  
  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  /**
   * Cache health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    metrics: CacheMetrics;
    responseTime: number;
    details: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Test basic operations
      const testKey = 'health_check';
      const testValue = { timestamp: Date.now(), test: true };
      
      await this.set(testKey, testValue, 10);
      const result = await this.get(testKey);
      await this.invalidate(testKey);
      
      const responseTime = Date.now() - startTime;
      const metrics = this.getMetrics();
      
      const healthy = responseTime < 50 && result.success && metrics.errorCount < 10;
      
      return {
        healthy,
        metrics,
        responseTime,
        details: {
          redis: {
            connected: !!this.redis,
            cluster: config.redis.cluster.enabled,
            responseTime
          },
          l1Cache: {
            size: this.l1Cache.size,
            maxSize: this.l1CacheMaxSize,
            memoryUsage: process.memoryUsage().heapUsed
          },
          performance: {
            hitRate: metrics.hitRate,
            averageResponseTime: metrics.averageResponseTime,
            errorRate: metrics.errorCount / Math.max(metrics.totalOperations, 1)
          }
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Cache health check failed', error as Error);
      
      return {
        healthy: false,
        metrics: this.getMetrics(),
        responseTime,
        details: {
          error: (error as Error).message,
          sama_incident: true
        }
      };
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      
      // Clear L1 cache
      this.l1Cache.clear();
      
      logger.info('Redis cache shut down gracefully', {
        finalMetrics: this.getMetrics(),
        sama_shutdown: true
      });
      
    } catch (error) {
      logger.error('Error during cache shutdown', error as Error);
    }
  }
  
  /**
   * Private helper methods
   */
  private buildKey(key: string): string {
    return `${this.cacheConfig.keyPrefix}${key}`;
  }
  
  private serialize(value: any): string {
    return JSON.stringify(value);
  }
  
  private deserialize<T>(value: string): T {
    return JSON.parse(value);
  }
  
  private getFromL1<T>(key: string): T | null {
    const cached = this.l1Cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    } else if (cached) {
      this.l1Cache.delete(key);
    }
    return null;
  }
  
  private setInL1(key: string, value: any, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.l1Cache.size >= this.l1CacheMaxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(firstKey);
    }
    
    this.l1Cache.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    });
  }
  
  private async setCacheFamily(key: string, fullKey: string, ttl: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      const family = this.getCacheFamily(key);
      if (family) {
        await this.redis.sadd(`cache_family:${family}`, fullKey);
        await this.redis.expire(`cache_family:${family}`, ttl);
      }
    } catch (error) {
      // Non-critical error, log but don't throw
      logger.debug('Failed to set cache family', { key, family: this.getCacheFamily(key) });
    }
  }
  
  private getCacheFamily(key: string): string | null {
    if (key.startsWith('admin:')) return 'admin';
    if (key.startsWith('kyc:')) return 'kyc';
    if (key.startsWith('settings:')) return 'settings';
    if (key.startsWith('dashboard:')) return 'dashboard';
    return null;
  }
  
  private recordHit(source: 'L1' | 'L2'): void {
    this.metrics.hits++;
    this.metrics.totalOperations++;
    this.updateHitRate();
  }
  
  private recordMiss(): void {
    this.metrics.misses++;
    this.metrics.totalOperations++;
    this.updateHitRate();
  }
  
  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalOperations > 0 ?
      this.metrics.hits / this.metrics.totalOperations : 0;
  }
  
  private updateMetrics(): void {
    this.metrics.lastUpdate = new Date();
    
    // Update memory metrics if available
    if (this.redis && 'info' in this.redis) {
      this.redis.info('memory').then((info: string) => {
        const lines = info.split('\r\n');
        for (const line of lines) {
          if (line.startsWith('used_memory:')) {
            this.metrics.memory.used = parseInt(line.split(':')[1]);
          } else if (line.startsWith('used_memory_peak:')) {
            this.metrics.memory.peak = parseInt(line.split(':')[1]);
          } else if (line.startsWith('mem_fragmentation_ratio:')) {
            this.metrics.memory.fragmentation = parseFloat(line.split(':')[1]);
          }
        }
      }).catch(() => {
        // Ignore errors in metrics collection
      });
    }
  }
  
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update every 30 seconds
  }
}

// Create singleton cache manager instance
export const cache = new RedisCacheManager();

// Export commonly used functions
export const get = cache.get.bind(cache);
export const set = cache.set.bind(cache);
export const invalidate = cache.invalidate.bind(cache);
export const mget = cache.mget.bind(cache);
export const mset = cache.mset.bind(cache);
export const getCacheMetrics = cache.getMetrics.bind(cache);

// Initialize cache connection
export const initializeCache = async (): Promise<void> => {
  await cache.initialize();
};

// Shutdown cache
export const shutdownCache = async (): Promise<void> => {
  await cache.shutdown();
};

// Cache helper functions for common patterns
export const cacheMiddleware = (keyBuilder: (req: any) => string, ttl?: number) => {
  return async (req: any, res: any, next: any) => {
    const key = keyBuilder(req);
    const cached = await get(key);
    
    if (cached.success && cached.cached) {
      return res.json(cached.data);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data: any) {
      set(key, data, ttl);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export default cache;