import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { hostname } from 'os';

// SAMA compliant logging configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (metadata && Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
  })
);

// Daily rotate file transport for production logs
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/user-service-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '30d', // Keep logs for 30 days
  format: logFormat,
  auditFile: 'logs/.audit/user-service-audit.json'
});

// Error log file transport
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/user-service-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '90d', // Keep error logs for 90 days
  level: 'error',
  format: logFormat,
  auditFile: 'logs/.audit/user-service-error-audit.json'
});

// SAMA compliance audit log transport
const auditFileTransport = new DailyRotateFile({
  filename: 'logs/sama-audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '2555d', // 7 years retention for SAMA compliance
  format: logFormat,
  auditFile: 'logs/.audit/sama-audit.json'
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'user-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: hostname()
  },
  transports: [
    fileRotateTransport,
    errorFileTransport
  ],
  exitOnError: false
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// SAMA compliance audit logger
export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'user-service',
    compliance: 'SAMA',
    framework: 'CSF'
  },
  transports: [auditFileTransport]
});

// Performance logger for monitoring
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'user-service',
    type: 'performance'
  },
  transports: [
    new DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '7d',
      format: logFormat
    })
  ]
});

// Helper functions for structured logging
export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, metadata);
};

export const logError = (message: string, error?: any, metadata?: any) => {
  logger.error(message, { error: error?.stack || error, ...metadata });
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, metadata);
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, metadata);
};

// SAMA compliance audit logging
export const logAudit = (eventType: string, eventData: any, userId?: string) => {
  auditLogger.info('Audit Event', {
    eventType,
    eventData,
    userId,
    timestamp: new Date().toISOString(),
    correlationId: eventData.correlationId || 'N/A'
  });
};

// Performance metric logging
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  performanceLogger.info('Performance Metric', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};