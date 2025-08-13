/**
 * RABHAN Admin Service Environment Configuration
 * Saudi Arabia's Solar BNPL Platform - Admin Management Service
 * 
 * World-Class Configuration Management:
 * - SAMA Compliance Settings
 * - Zero-Trust Security Configuration
 * - Sub-2ms Performance Optimization
 * - KSA Multi-Region Support
 * - Type-Safe Environment Variables
 */

import * as dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

/**
 * Environment Configuration Schema for SAMA Compliance
 */
const configSchema = Joi.object({
  // Service Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'testing', 'staging', 'production')
    .default('development'),
  SERVICE_NAME: Joi.string().default('admin-service'),
  SERVICE_VERSION: Joi.string().default('1.0.0'),
  PORT: Joi.number().port().default(3006),
  HOST: Joi.string().default('0.0.0.0'),
  
  // Database Configuration - PostgreSQL Optimized
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().default('rabhan_admin'),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_POOL_MIN: Joi.number().min(5).default(10),
  DATABASE_POOL_MAX: Joi.number().min(10).default(50),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_CA_CERT: Joi.string().allow(''),
  DATABASE_CLIENT_CERT: Joi.string().allow(''),
  DATABASE_CLIENT_KEY: Joi.string().allow(''),
  
  // Redis Configuration - High Performance Caching
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_ENABLED: Joi.boolean().default(true),
  REDIS_CLUSTER_ENABLED: Joi.boolean().default(false),
  REDIS_CLUSTER_NODES: Joi.string().allow(''),
  
  // JWT Configuration - Zero-Trust Security
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ADMIN_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().default('rabhan-admin-service'),
  JWT_AUDIENCE: Joi.string().default('rabhan-platform'),
  
  // Security Configuration
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
  SESSION_SECRET: Joi.string().min(32).required(),
  MFA_SECRET_LENGTH: Joi.number().min(20).default(32),
  MAX_LOGIN_ATTEMPTS: Joi.number().min(3).max(10).default(5),
  LOCKOUT_DURATION_MINUTES: Joi.number().min(5).max(60).default(15),
  
  // SAMA Compliance Configuration
  SAMA_AUDIT_ENABLED: Joi.boolean().default(true),
  SAMA_RETENTION_YEARS: Joi.number().min(7).default(7),
  SAMA_INCIDENT_NOTIFICATION_HOURS: Joi.number().min(1).max(24).default(4),
  SAMA_ENCRYPTION_ALGORITHM: Joi.string().default('AES-256-GCM'),
  SAMA_COMPLIANCE_LEVEL: Joi.string().valid('BASIC', 'STANDARD', 'ENHANCED', 'CRITICAL').default('CRITICAL'),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_ADMIN_MAX_REQUESTS: Joi.number().default(500),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(false),
  
  // External Service URLs
  USER_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  CONTRACTOR_SERVICE_URL: Joi.string().uri().default('http://localhost:3004'),
  DOCUMENT_SERVICE_URL: Joi.string().uri().default('http://localhost:3003'),
  AUTH_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().allow(''),
  
  // Saudi Regional Configuration
  DEFAULT_REGION: Joi.string().default('ksa'),
  DEFAULT_TIMEZONE: Joi.string().default('Asia/Riyadh'),
  SUPPORTED_REGIONS: Joi.string().default('riyadh,jeddah,dammam,khobar,mecca,medina'),
  KSA_BUSINESS_HOURS_START: Joi.number().min(0).max(23).default(8),
  KSA_BUSINESS_HOURS_END: Joi.number().min(0).max(23).default(17),
  
  // Monitoring and Observability
  MONITORING_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  HEALTH_CHECK_INTERVAL_MS: Joi.number().default(30000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
  
  // Performance Configuration
  RESPONSE_TIME_THRESHOLD_MS: Joi.number().default(2), // Sub-2ms target
  CONCURRENT_REQUEST_LIMIT: Joi.number().default(1000),
  MEMORY_LIMIT_MB: Joi.number().default(512),
  CPU_THRESHOLD_PERCENT: Joi.number().min(0).max(100).default(80),
  
  // File Upload Configuration
  MAX_FILE_SIZE_MB: Joi.number().default(10),
  ALLOWED_FILE_TYPES: Joi.string().default('.pdf,.jpg,.jpeg,.png,.doc,.docx'),
  UPLOAD_TEMP_DIR: Joi.string().default('./temp'),
  
  // Email Configuration (for notifications)
  SMTP_HOST: Joi.string().allow(''),
  SMTP_PORT: Joi.number().port().allow(''),
  SMTP_SECURE: Joi.boolean().default(true),
  SMTP_USER: Joi.string().allow(''),
  SMTP_PASSWORD: Joi.string().allow(''),
  EMAIL_FROM: Joi.string().email().allow(''),
  
  // Backup and Recovery
  BACKUP_ENABLED: Joi.boolean().default(true),
  BACKUP_INTERVAL_HOURS: Joi.number().min(1).max(24).default(6),
  BACKUP_RETENTION_DAYS: Joi.number().min(30).default(90),
  
  // Development and Testing
  DEBUG_ENABLED: Joi.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: Joi.boolean().default(false),
  TEST_DATABASE_NAME: Joi.string().allow(''),
  
  // AWS/Cloud Configuration (for production)
  AWS_REGION: Joi.string().default('me-south-1'), // Saudi Arabia region
  AWS_ACCESS_KEY_ID: Joi.string().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow(''),
  S3_BUCKET_NAME: Joi.string().allow(''),
  
  // Feature Flags
  FEATURE_KYC_AUTO_APPROVAL: Joi.boolean().default(false),
  FEATURE_BULK_OPERATIONS: Joi.boolean().default(true),
  FEATURE_ADVANCED_ANALYTICS: Joi.boolean().default(true),
  FEATURE_REAL_TIME_DASHBOARD: Joi.boolean().default(true),
}).unknown();

/**
 * Validate and parse environment configuration
 */
const { error, value: envVars } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Environment configuration validation error: ${error.message}`);
}

/**
 * Type-safe configuration object
 */
export interface Config {
  // Service Configuration
  nodeEnv: 'development' | 'testing' | 'staging' | 'production';
  serviceName: string;
  serviceVersion: string;
  port: number;
  host: string;
  
  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolMin: number;
    poolMax: number;
    ssl: boolean;
    sslConfig?: {
      ca?: string;
      cert?: string;
      key?: string;
    };
  };
  
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    enabled: boolean;
    cluster: {
      enabled: boolean;
      nodes?: string[];
    };
  };
  
  // JWT Configuration
  jwt: {
    secret: string;
    adminSecret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };
  
  // Security Configuration
  security: {
    bcryptRounds: number;
    sessionSecret: string;
    mfaSecretLength: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
  
  // SAMA Compliance Configuration
  sama: {
    auditEnabled: boolean;
    retentionYears: number;
    incidentNotificationHours: number;
    encryptionAlgorithm: string;
    complianceLevel: 'BASIC' | 'STANDARD' | 'ENHANCED' | 'CRITICAL';
  };
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    adminMaxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  
  // External Services
  services: {
    userService: string;
    contractorService: string;
    documentService: string;
    authService: string;
    notificationService?: string;
  };
  
  // Saudi Regional Configuration
  regional: {
    defaultRegion: string;
    defaultTimezone: string;
    supportedRegions: string[];
    businessHours: {
      start: number;
      end: number;
    };
  };
  
  // Monitoring Configuration
  monitoring: {
    enabled: boolean;
    metricsPort: number;
    healthCheckIntervalMs: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    logFormat: 'json' | 'simple';
  };
  
  // Performance Configuration
  performance: {
    responseTimeThresholdMs: number;
    concurrentRequestLimit: number;
    memoryLimitMb: number;
    cpuThresholdPercent: number;
  };
  
  // Feature Flags
  features: {
    kycAutoApproval: boolean;
    bulkOperations: boolean;
    advancedAnalytics: boolean;
    realTimeDashboard: boolean;
  };
}

/**
 * Parsed and validated configuration
 */
export const config: Config = {
  // Service Configuration
  nodeEnv: envVars.NODE_ENV,
  serviceName: envVars.SERVICE_NAME,
  serviceVersion: envVars.SERVICE_VERSION,
  port: envVars.PORT,
  host: envVars.HOST,
  
  // Database Configuration
  database: {
    host: envVars.DATABASE_HOST,
    port: envVars.DATABASE_PORT,
    name: envVars.DATABASE_NAME,
    user: envVars.DATABASE_USER,
    password: envVars.DATABASE_PASSWORD,
    poolMin: envVars.DATABASE_POOL_MIN,
    poolMax: envVars.DATABASE_POOL_MAX,
    ssl: envVars.DATABASE_SSL,
    ...(envVars.DATABASE_SSL && {
      sslConfig: {
        ca: envVars.DATABASE_CA_CERT,
        cert: envVars.DATABASE_CLIENT_CERT,
        key: envVars.DATABASE_CLIENT_KEY,
      }
    }),
  },
  
  // Redis Configuration
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    enabled: envVars.REDIS_ENABLED,
    cluster: {
      enabled: envVars.REDIS_CLUSTER_ENABLED,
      nodes: envVars.REDIS_CLUSTER_NODES ? 
        envVars.REDIS_CLUSTER_NODES.split(',').map((node: string) => node.trim()) : 
        undefined,
    },
  },
  
  // JWT Configuration
  jwt: {
    secret: envVars.JWT_SECRET,
    adminSecret: envVars.JWT_ADMIN_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    issuer: envVars.JWT_ISSUER,
    audience: envVars.JWT_AUDIENCE,
  },
  
  // Security Configuration
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    sessionSecret: envVars.SESSION_SECRET,
    mfaSecretLength: envVars.MFA_SECRET_LENGTH,
    maxLoginAttempts: envVars.MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: envVars.LOCKOUT_DURATION_MINUTES,
  },
  
  // SAMA Compliance Configuration
  sama: {
    auditEnabled: envVars.SAMA_AUDIT_ENABLED,
    retentionYears: envVars.SAMA_RETENTION_YEARS,
    incidentNotificationHours: envVars.SAMA_INCIDENT_NOTIFICATION_HOURS,
    encryptionAlgorithm: envVars.SAMA_ENCRYPTION_ALGORITHM,
    complianceLevel: envVars.SAMA_COMPLIANCE_LEVEL,
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    adminMaxRequests: envVars.RATE_LIMIT_ADMIN_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
  },
  
  // External Services
  services: {
    userService: envVars.USER_SERVICE_URL,
    contractorService: envVars.CONTRACTOR_SERVICE_URL,
    documentService: envVars.DOCUMENT_SERVICE_URL,
    authService: envVars.AUTH_SERVICE_URL,
    notificationService: envVars.NOTIFICATION_SERVICE_URL || undefined,
  },
  
  // Saudi Regional Configuration
  regional: {
    defaultRegion: envVars.DEFAULT_REGION,
    defaultTimezone: envVars.DEFAULT_TIMEZONE,
    supportedRegions: envVars.SUPPORTED_REGIONS.split(',').map((region: string) => region.trim()),
    businessHours: {
      start: envVars.KSA_BUSINESS_HOURS_START,
      end: envVars.KSA_BUSINESS_HOURS_END,
    },
  },
  
  // Monitoring Configuration
  monitoring: {
    enabled: envVars.MONITORING_ENABLED,
    metricsPort: envVars.METRICS_PORT,
    healthCheckIntervalMs: envVars.HEALTH_CHECK_INTERVAL_MS,
    logLevel: envVars.LOG_LEVEL,
    logFormat: envVars.LOG_FORMAT,
  },
  
  // Performance Configuration
  performance: {
    responseTimeThresholdMs: envVars.RESPONSE_TIME_THRESHOLD_MS,
    concurrentRequestLimit: envVars.CONCURRENT_REQUEST_LIMIT,
    memoryLimitMb: envVars.MEMORY_LIMIT_MB,
    cpuThresholdPercent: envVars.CPU_THRESHOLD_PERCENT,
  },
  
  // Feature Flags
  features: {
    kycAutoApproval: envVars.FEATURE_KYC_AUTO_APPROVAL,
    bulkOperations: envVars.FEATURE_BULK_OPERATIONS,
    advancedAnalytics: envVars.FEATURE_ADVANCED_ANALYTICS,
    realTimeDashboard: envVars.FEATURE_REAL_TIME_DASHBOARD,
  },
};

/**
 * Configuration validation and health check
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Critical configuration checks
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  
  if (!config.jwt.adminSecret || config.jwt.adminSecret.length < 32) {
    errors.push('JWT_ADMIN_SECRET must be at least 32 characters');
  }
  
  if (!config.database.host || !config.database.user || !config.database.password) {
    errors.push('Database configuration is incomplete');
  }
  
  if (config.nodeEnv === 'production') {
    if (!config.database.ssl) {
      errors.push('SSL must be enabled in production');
    }
    
    if (config.monitoring.logLevel === 'debug') {
      errors.push('Debug logging should not be enabled in production');
    }
    
    if (config.security.bcryptRounds < 12) {
      errors.push('BCrypt rounds should be at least 12 in production');
    }
  }
  
  // SAMA compliance checks
  if (config.sama.auditEnabled && config.sama.retentionYears < 7) {
    errors.push('SAMA requires minimum 7-year audit retention');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Log configuration summary (excluding sensitive data)
 */
export const getConfigSummary = () => ({
  service: {
    name: config.serviceName,
    version: config.serviceVersion,
    environment: config.nodeEnv,
    port: config.port,
  },
  database: {
    host: config.database.host,
    name: config.database.name,
    ssl: config.database.ssl,
  },
  redis: {
    enabled: config.redis.enabled,
    cluster: config.redis.cluster.enabled,
  },
  sama: {
    compliance: config.sama.complianceLevel,
    auditEnabled: config.sama.auditEnabled,
    retentionYears: config.sama.retentionYears,
  },
  regional: {
    defaultRegion: config.regional.defaultRegion,
    timezone: config.regional.defaultTimezone,
    supportedRegions: config.regional.supportedRegions,
  },
  performance: {
    responseTimeTarget: `${config.performance.responseTimeThresholdMs}ms`,
    memoryLimit: `${config.performance.memoryLimitMb}MB`,
  },
  features: config.features,
});

export default config;