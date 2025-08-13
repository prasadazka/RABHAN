import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Environment variables schema for validation
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().default(3009),
  
  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().default('quote_service_db'),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // Service URLs
  AUTH_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  USER_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  CONTRACTOR_SERVICE_URL: Joi.string().uri().default('http://localhost:3004'),
  ADMIN_SERVICE_URL: Joi.string().uri().default('http://localhost:3006'),
  SOLAR_SERVICE_URL: Joi.string().uri().default('http://localhost:3005'),
  
  // Business Rules (Configurable)
  MAX_PRICE_PER_KWP: Joi.number().default(2000),
  PLATFORM_OVERPRICE_PERCENT: Joi.number().default(10),
  PLATFORM_COMMISSION_PERCENT: Joi.number().default(15),
  
  // Penalty Rules
  USER_CANCELLATION_PENALTY: Joi.number().default(500),
  CONTRACTOR_PENALTY_PERCENT: Joi.number().default(50),
  INSTALLATION_DELAY_PENALTY_PER_DAY: Joi.number().default(100),
  
  // Payment Rules
  MIN_DOWN_PAYMENT_PERCENT: Joi.number().default(20),
  MAX_INSTALLMENT_MONTHS: Joi.number().default(24),
  VAT_RATE: Joi.number().default(15),
  
  // Quote Rules
  MAX_CONTRACTORS_PER_REQUEST: Joi.number().default(3),
  QUOTE_VALIDITY_DAYS: Joi.number().default(30),
  MIN_INSPECTION_NOTICE_HOURS: Joi.number().default(24),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_DIR: Joi.string().default('./logs'),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100)
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  // Environment
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  
  // Database
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD
  },
  
  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN
  },
  
  // Service URLs
  services: {
    auth: envVars.AUTH_SERVICE_URL,
    user: envVars.USER_SERVICE_URL,
    contractor: envVars.CONTRACTOR_SERVICE_URL,
    admin: envVars.ADMIN_SERVICE_URL,
    solar: envVars.SOLAR_SERVICE_URL
  },
  
  // Business Rules
  businessRules: {
    maxPricePerKwp: envVars.MAX_PRICE_PER_KWP,
    platformOverpricePercent: envVars.PLATFORM_OVERPRICE_PERCENT,
    platformCommissionPercent: envVars.PLATFORM_COMMISSION_PERCENT,
    userCancellationPenalty: envVars.USER_CANCELLATION_PENALTY,
    contractorPenaltyPercent: envVars.CONTRACTOR_PENALTY_PERCENT,
    installationDelayPenaltyPerDay: envVars.INSTALLATION_DELAY_PENALTY_PER_DAY,
    minDownPaymentPercent: envVars.MIN_DOWN_PAYMENT_PERCENT,
    maxInstallmentMonths: envVars.MAX_INSTALLMENT_MONTHS,
    vatRate: envVars.VAT_RATE,
    maxContractorsPerRequest: envVars.MAX_CONTRACTORS_PER_REQUEST,
    quoteValidityDays: envVars.QUOTE_VALIDITY_DAYS,
    minInspectionNoticeHours: envVars.MIN_INSPECTION_NOTICE_HOURS
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    dir: envVars.LOG_DIR
  },
  
  // CORS
  corsOrigin: envVars.CORS_ORIGIN,
  
  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
  }
};

export default config;