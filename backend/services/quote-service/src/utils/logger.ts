import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from '../config/environment.config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Create logs directory if it doesn't exist
const logDir = path.resolve(config.logging.dir);

// Define log transports
const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    )
  }),
  
  // Daily rotating file for general logs
  new DailyRotateFile({
    filename: path.join(logDir, 'quote-service-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: logFormat
  }),
  
  // Daily rotating file for error logs
  new DailyRotateFile({
    filename: path.join(logDir, 'quote-service-error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat
  }),
  
  // Performance logs
  new DailyRotateFile({
    filename: path.join(logDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    level: 'debug',
    format: logFormat
  }),
  
  // SAMA Audit logs (for compliance)
  new DailyRotateFile({
    filename: path.join(logDir, 'sama-audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '365d', // Keep for 1 year for compliance
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create the logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'exceptions.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d'
  })
);

logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'rejections.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d'
  })
);

// SAMA Audit logging helper
export const auditLogger = {
  financial: (action: string, data: any) => {
    logger.info('SAMA_FINANCIAL_AUDIT', {
      audit_type: 'financial',
      action,
      timestamp: new Date().toISOString(),
      ...data
    });
  },
  
  quote: (action: string, data: any) => {
    logger.info('SAMA_QUOTE_AUDIT', {
      audit_type: 'quote',
      action,
      timestamp: new Date().toISOString(),
      ...data
    });
  },
  
  security: (action: string, data: any) => {
    logger.warn('SAMA_SECURITY_AUDIT', {
      audit_type: 'security',
      action,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
};

// Performance logging helper
export const performanceLogger = {
  startTimer: (operation: string) => {
    const start = Date.now();
    return {
      end: (additionalData?: any) => {
        const duration = Date.now() - start;
        logger.debug('PERFORMANCE_METRIC', {
          operation,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          ...additionalData
        });
        return duration;
      }
    };
  }
};

export default logger;