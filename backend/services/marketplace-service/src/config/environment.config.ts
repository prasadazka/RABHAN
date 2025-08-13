/**
 * RABHAN Marketplace Service - Environment Configuration
 * SAMA Compliant | Zero-Trust Security | KSA Data Residency
 */

import { config } from 'dotenv';

// Load environment variables
config();

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: number;
  HOST: string;
  SERVICE_NAME: string;
  
  // Database Configuration
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  DB_MAX_CONNECTIONS: number;
  
  // Redis Configuration
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string | undefined;
  REDIS_TLS: boolean;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRE: string;
  
  // SAMA Compliance
  SAMA_AUDIT_ENABLED: boolean;
  SAMA_ENCRYPTION_KEY: string;
  SAMA_REPORTING_ENDPOINT: string | undefined;
  
  // Security Configuration
  CORS_ORIGIN: string[];
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
  ENCRYPTION_ALGORITHM: string;
  
  // Logging Configuration
  LOG_LEVEL: string;
  LOG_FORMAT: string;
  LOG_FILE_ENABLED: boolean;
  
  // Performance Configuration
  CACHE_TTL: number;
  QUERY_TIMEOUT: number;
  CONNECTION_TIMEOUT: number;
  
  // KSA Specific
  TIMEZONE: string;
  LOCALE: string;
  CURRENCY: string;
  
  // Service Integration
  AUTH_SERVICE_URL: string;
  USER_SERVICE_URL: string;
  CONTRACTOR_SERVICE_URL: string;
  DOCUMENT_SERVICE_URL: string;
}

class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      // Application Configuration
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: parseInt(process.env.PORT || '3007', 10),
      HOST: process.env.HOST || '0.0.0.0',
      SERVICE_NAME: process.env.SERVICE_NAME || 'marketplace-service',

      // Database Configuration  
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
      DB_NAME: process.env.DB_NAME || 'rabhan_marketplace',
      DB_USER: process.env.DB_USER || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      DB_SSL: process.env.DB_SSL === 'true',
      DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),

      // Redis Configuration
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_TLS: process.env.REDIS_TLS === 'true',

      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-development',
      JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

      // SAMA Compliance Configuration
      SAMA_AUDIT_ENABLED: process.env.SAMA_AUDIT_ENABLED !== 'false',
      SAMA_ENCRYPTION_KEY: process.env.SAMA_ENCRYPTION_KEY || 'fallback-encryption-key',
      SAMA_REPORTING_ENDPOINT: process.env.SAMA_REPORTING_ENDPOINT || '',

      // Security Configuration
      CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
      RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
      ENCRYPTION_ALGORITHM: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',

      // Logging Configuration
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_FORMAT: process.env.LOG_FORMAT || 'json',
      LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED !== 'false',

      // Performance Configuration
      CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
      QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || '5000', 10), // 5 seconds
      CONNECTION_TIMEOUT: parseInt(process.env.CONNECTION_TIMEOUT || '3000', 10), // 3 seconds

      // KSA Specific Configuration
      TIMEZONE: process.env.TIMEZONE || 'Asia/Riyadh',
      LOCALE: process.env.LOCALE || 'ar-SA',
      CURRENCY: process.env.CURRENCY || 'SAR',

      // Service Integration URLs
      AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      CONTRACTOR_SERVICE_URL: process.env.CONTRACTOR_SERVICE_URL || 'http://localhost:3004',
      DOCUMENT_SERVICE_URL: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3003'
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Critical security validations
    if (this.config.NODE_ENV === 'production') {
      if (this.config.JWT_SECRET === 'fallback-secret-for-development') {
        errors.push('JWT_SECRET must be set in production');
      }
      
      if (this.config.SAMA_ENCRYPTION_KEY === 'fallback-encryption-key') {
        errors.push('SAMA_ENCRYPTION_KEY must be set in production');
      }

      if (!this.config.DB_SSL) {
        errors.push('DB_SSL must be enabled in production');
      }

      if (!this.config.REDIS_TLS) {
        errors.push('REDIS_TLS must be enabled in production');
      }
    }

    // Required environment variables
    const required = [
      'DB_PASSWORD',
      'JWT_SECRET'
    ];

    required.forEach(key => {
      if (!process.env[key]) {
        errors.push(`Required environment variable missing: ${key}`);
      }
    });

    // Validate numeric values
    if (this.config.PORT < 1 || this.config.PORT > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }

    if (this.config.DB_MAX_CONNECTIONS < 1 || this.config.DB_MAX_CONNECTIONS > 100) {
      errors.push('DB_MAX_CONNECTIONS must be between 1 and 100');
    }

    if (this.config.RATE_LIMIT_MAX < 1) {
      errors.push('RATE_LIMIT_MAX must be greater than 0');
    }

    // SAMA compliance validations
    if (this.config.SAMA_AUDIT_ENABLED && !this.config.SAMA_ENCRYPTION_KEY) {
      errors.push('SAMA_ENCRYPTION_KEY required when audit is enabled');
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isStaging(): boolean {
    return this.config.NODE_ENV === 'staging';
  }
}

// Singleton instance
const envManager = new EnvironmentManager();

export const env = envManager.getConfig();

// Export configuration groups for easier access
export const corsConfig = {
  origins: env.CORS_ORIGIN,
  credentials: true
};

export const securityConfig = {
  rateLimitEnabled: true,
  rateLimitMax: env.RATE_LIMIT_MAX,
  rateLimitWindow: env.RATE_LIMIT_WINDOW
};

export { envManager };
export default envManager;