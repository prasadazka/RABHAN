import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    serviceName: process.env.SERVICE_NAME || 'auth-service'
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/rabhan_auth',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10)
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'rabhan:auth:'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    // 🚀 DEVELOPMENT MODE: Use dummy OTP for easier testing
    useDummyOTP: process.env.USE_DUMMY_OTP === 'true' || process.env.NODE_ENV === 'development'
  },
  
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@rabhan.sa',
    fromName: process.env.SENDGRID_FROM_NAME || 'RABHAN',
    emailVerificationTemplateId: process.env.SENDGRID_EMAIL_VERIFICATION_TEMPLATE_ID
  },

  email: {
    service: process.env.EMAIL_SERVICE || 'sendgrid',
    from: process.env.EMAIL_FROM || 'noreply@rabhan.sa'
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
    domain: process.env.FRONTEND_DOMAIN || 'localhost'
  },
  
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    accountLockDurationMs: parseInt(process.env.ACCOUNT_LOCK_DURATION_MS || '1800000', 10)
  },
  
  sama: {
    auditEnabled: process.env.SAMA_AUDIT_ENABLED === 'true',
    complianceMode: process.env.SAMA_COMPLIANCE_MODE || 'strict'
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
} as const;

export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];
  
  // In production, SendGrid is required
  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('SENDGRID_API_KEY');
  }
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}