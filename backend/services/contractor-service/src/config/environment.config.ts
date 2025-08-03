import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// SAMA-compliant environment configuration
export interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: string;
  SERVICE_NAME: string;
  
  // Database Configuration
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  
  // Security Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  
  // External Services
  AUTH_SERVICE_URL: string;
  USER_SERVICE_URL: string;
  DOCUMENT_SERVICE_URL: string;
  
  // File Upload Configuration
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];
  UPLOAD_PATH: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Saudi Specific Settings
  DEFAULT_TIMEZONE: string;
  DEFAULT_LOCALE: string;
  SAUDI_REGIONS: string[];
  
  // SAMA Compliance
  AUDIT_LOG_RETENTION_DAYS: number;
  SAMA_REPORTING_ENABLED: boolean;
  COMPLIANCE_LEVEL: string;
  
  // Monitoring
  ENABLE_METRICS: boolean;
  LOG_LEVEL: string;
  
  // Business Rules
  MIN_CONTRACTOR_AGE: number;
  MAX_SERVICE_AREAS: number;
  VERIFICATION_EXPIRY_DAYS: number;
}

// Default configuration with Saudi-specific settings
const defaultConfig: Partial<EnvironmentConfig> = {
  NODE_ENV: 'development',
  SERVICE_NAME: 'contractor-service',
  
  // Database defaults
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'rabhan_contractors',
  
  // Security defaults
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '24h',
  
  // File upload defaults
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  UPLOAD_PATH: './uploads',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Saudi defaults
  DEFAULT_TIMEZONE: 'Asia/Riyadh',
  DEFAULT_LOCALE: 'ar-SA',
  SAUDI_REGIONS: [
    'Riyadh', 'Makkah', 'Madinah', 'Qassim', 'Eastern Province',
    'Asir', 'Tabuk', 'Hail', 'Northern Borders', 'Jazan',
    'Najran', 'Al Bahah', 'Al Jawf'
  ],
  
  // SAMA compliance defaults
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years as per SAMA requirement
  SAMA_REPORTING_ENABLED: true,
  COMPLIANCE_LEVEL: 'high',
  
  // Monitoring defaults
  ENABLE_METRICS: true,
  LOG_LEVEL: 'info',
  
  // Business rules defaults
  MIN_CONTRACTOR_AGE: 18,
  MAX_SERVICE_AREAS: 10,
  VERIFICATION_EXPIRY_DAYS: 365
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_PASSWORD',
  'JWT_SECRET'
];

const validateEnvironment = (): void => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate critical security settings
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    
    if (!process.env.DATABASE_PASSWORD || process.env.DATABASE_PASSWORD.length < 16) {
      throw new Error('DATABASE_PASSWORD must be at least 16 characters in production');
    }
  }
  
  console.log('Environment validation passed for', process.env.NODE_ENV);
};

// Create configuration object
const createConfig = (): EnvironmentConfig => {
  return {
    // Server
    PORT: parseInt(process.env.PORT || '3004'),
    NODE_ENV: process.env.NODE_ENV || defaultConfig.NODE_ENV!,
    SERVICE_NAME: process.env.SERVICE_NAME || defaultConfig.SERVICE_NAME!,
    
    // Database
    DATABASE_HOST: process.env.DATABASE_HOST || defaultConfig.DATABASE_HOST!,
    DATABASE_PORT: parseInt(process.env.DATABASE_PORT || defaultConfig.DATABASE_PORT!.toString()),
    DATABASE_NAME: process.env.DATABASE_NAME || defaultConfig.DATABASE_NAME!,
    DATABASE_USER: process.env.DATABASE_USER || 'contractor_service',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
    
    // Security
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || defaultConfig.JWT_EXPIRES_IN!,
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || defaultConfig.BCRYPT_ROUNDS!.toString()),
    
    // External Services
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    DOCUMENT_SERVICE_URL: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3003',
    
    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || defaultConfig.MAX_FILE_SIZE!.toString()),
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || defaultConfig.ALLOWED_FILE_TYPES!,
    UPLOAD_PATH: process.env.UPLOAD_PATH || defaultConfig.UPLOAD_PATH!,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || defaultConfig.RATE_LIMIT_WINDOW_MS!.toString()),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || defaultConfig.RATE_LIMIT_MAX_REQUESTS!.toString()),
    
    // Saudi Settings
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || defaultConfig.DEFAULT_TIMEZONE!,
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || defaultConfig.DEFAULT_LOCALE!,
    SAUDI_REGIONS: process.env.SAUDI_REGIONS?.split(',') || defaultConfig.SAUDI_REGIONS!,
    
    // SAMA Compliance
    AUDIT_LOG_RETENTION_DAYS: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || defaultConfig.AUDIT_LOG_RETENTION_DAYS!.toString()),
    SAMA_REPORTING_ENABLED: process.env.SAMA_REPORTING_ENABLED === 'true' || defaultConfig.SAMA_REPORTING_ENABLED!,
    COMPLIANCE_LEVEL: process.env.COMPLIANCE_LEVEL || defaultConfig.COMPLIANCE_LEVEL!,
    
    // Monitoring
    ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false' && defaultConfig.ENABLE_METRICS!,
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig.LOG_LEVEL!,
    
    // Business Rules
    MIN_CONTRACTOR_AGE: parseInt(process.env.MIN_CONTRACTOR_AGE || defaultConfig.MIN_CONTRACTOR_AGE!.toString()),
    MAX_SERVICE_AREAS: parseInt(process.env.MAX_SERVICE_AREAS || defaultConfig.MAX_SERVICE_AREAS!.toString()),
    VERIFICATION_EXPIRY_DAYS: parseInt(process.env.VERIFICATION_EXPIRY_DAYS || defaultConfig.VERIFICATION_EXPIRY_DAYS!.toString())
  };
};

// Validate environment and create config
validateEnvironment();
export const config = createConfig();

// Log configuration (excluding sensitive data)
const logConfig = {
  ...config,
  DATABASE_PASSWORD: '***REDACTED***',
  JWT_SECRET: '***REDACTED***'
};

console.log('Contractor service configuration loaded:', {
  port: config.PORT,
  environment: config.NODE_ENV,
  service: config.SERVICE_NAME
});

export default config;