import { logger } from './logger';

// Shared mock Redis store for development
const mockRedisStore = new Map<string, string>();

export function createMockRedis() {
  return {
    get: async (key: string) => {
      const value = mockRedisStore.get(key);
      logger.info(`Mock Redis GET: ${key} = ${value || 'null'}`);
      return value || null;
    },
    setex: async (key: string, ttl: number, value: string) => { 
      mockRedisStore.set(key, value);
      logger.info(`Mock Redis SET: ${key} = ${value} (TTL: ${ttl}s)`);
      setTimeout(() => {
        mockRedisStore.delete(key);
        logger.info(`Mock Redis EXPIRED: ${key}`);
      }, ttl * 1000);
    },
    del: async (key: string) => { 
      mockRedisStore.delete(key);
      logger.info(`Mock Redis DEL: ${key}`);
    }
  };
}