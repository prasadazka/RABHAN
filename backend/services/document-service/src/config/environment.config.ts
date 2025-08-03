import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  
  server: {
    port: parseInt(process.env.PORT || '3003', 10), // Fixed port to match CLAUDE.md
    serviceName: process.env.SERVICE_NAME || 'document-service',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    uploadTimeout: parseInt(process.env.UPLOAD_TIMEOUT || '300000', 10), // 5 minutes
    allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001', // Added both localhost and 127.0.0.1
    maxUploadsPerHour: parseInt(process.env.MAX_UPLOADS_PER_HOUR || '50', 10), // Added rate limit config
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10),
    idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'rabhan:documents:',
    keyExpiry: parseInt(process.env.REDIS_KEY_EXPIRY || '3600', 10), // 1 hour
  },
  
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'rabhan-documents',
    region: process.env.MINIO_REGION || 'ksa-central',
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'me-south-1', // Middle East (Bahrain)
    s3Bucket: process.env.AWS_S3_BUCKET || 'rabhan-documents-prod',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    keyLength: parseInt(process.env.ENCRYPTION_KEY_LENGTH || '32', 10),
    ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10),
    tagLength: parseInt(process.env.ENCRYPTION_TAG_LENGTH || '16', 10),
    masterKey: process.env.ENCRYPTION_MASTER_KEY || 'your-master-key-here-change-in-production',
  },
  
  virusScanner: {
    enabled: process.env.VIRUS_SCANNER_ENABLED === 'true',
    clamAvPath: process.env.CLAMAV_PATH || '/usr/bin/clamscan',
    scanTimeout: parseInt(process.env.VIRUS_SCAN_TIMEOUT || '60000', 10), // 1 minute
    maxRetries: parseInt(process.env.VIRUS_SCAN_MAX_RETRIES || '3', 10),
  },
  
  ocr: {
    enabled: process.env.OCR_ENABLED === 'true',
    tesseractPath: process.env.TESSERACT_PATH || '/usr/bin/tesseract',
    languages: process.env.OCR_LANGUAGES || 'eng+ara', // English + Arabic
    minConfidence: parseFloat(process.env.OCR_MIN_CONFIDENCE || '0.7'),
  },
  
  validation: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    allowedFormats: process.env.ALLOWED_FORMATS?.split(',') || ['pdf', 'jpg', 'jpeg', 'png'],
    minImageWidth: parseInt(process.env.MIN_IMAGE_WIDTH || '300', 10),
    minImageHeight: parseInt(process.env.MIN_IMAGE_HEIGHT || '300', 10),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '4096', 10),
    maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '4096', 10),
  },
  
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10), // 1 hour
    maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '10', 10),
  },
  
  sama: {
    auditEnabled: process.env.SAMA_AUDIT_ENABLED === 'true',
    complianceMode: process.env.SAMA_COMPLIANCE_MODE || 'strict',
    notificationEndpoint: process.env.SAMA_NOTIFICATION_ENDPOINT,
    reportingEndpoint: process.env.SAMA_REPORTING_ENDPOINT,
    incidentNotificationTimeoutMs: parseInt(process.env.SAMA_INCIDENT_TIMEOUT || '14400000', 10), // 4 hours
    dataRetentionYears: parseInt(process.env.SAMA_DATA_RETENTION_YEARS || '7', 10),
  },
  
  authService: {
    baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    healthCheckPath: process.env.AUTH_SERVICE_HEALTH_PATH || '/api/auth/health',
    verifyTokenPath: process.env.AUTH_SERVICE_VERIFY_TOKEN_PATH || '/api/auth/verify',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '10000', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    enableConsole: process.env.LOG_ENABLE_CONSOLE === 'true',
  },
  
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    endpoint: process.env.MONITORING_ENDPOINT,
    interval: parseInt(process.env.MONITORING_INTERVAL || '60000', 10), // 1 minute
  },
  
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '90', 10),
    destination: process.env.BACKUP_DESTINATION || 's3://rabhan-backups/documents/',
  },
} as const;

export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'ENCRYPTION_MASTER_KEY',
  ];
  
  if (config.isProduction) {
    requiredEnvVars.push(
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'SAMA_NOTIFICATION_ENDPOINT',
      'SAMA_REPORTING_ENDPOINT'
    );
  }
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate configuration values
  if (config.server.maxFileSize > 104857600) { // 100MB
    throw new Error('MAX_FILE_SIZE cannot exceed 100MB');
  }
  
  if (config.validation.allowedFormats.length === 0) {
    throw new Error('ALLOWED_FORMATS must contain at least one format');
  }
  
  if (config.sama.dataRetentionYears < 7) {
    throw new Error('SAMA_DATA_RETENTION_YEARS must be at least 7 years');
  }
  
  if (config.encryption.keyLength < 32) {
    throw new Error('ENCRYPTION_KEY_LENGTH must be at least 32 bytes');
  }
}