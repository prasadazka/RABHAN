import winston from 'winston';
import { config } from '../config/environment.config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.server.serviceName },
  transports: [
    new winston.transports.Console({
      format: config.isDevelopment ? consoleFormat : logFormat
    })
  ]
});

if (config.isProduction) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880,
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/sama-audit.log',
    level: 'info',
    maxsize: 5242880,
    maxFiles: 30,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

export class SAMALogger {
  static logAuthEvent(eventType: string, userId?: string, data?: any): void {
    logger.info('SAMA_AUTH_EVENT', {
      eventType,
      userId,
      data,
      timestamp: new Date().toISOString(),
      compliance: 'SAMA_CSF_3.3.5'
    });
  }

  static logSecurityEvent(eventType: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', data?: any): void {
    logger.warn('SAMA_SECURITY_EVENT', {
      eventType,
      severity,
      data,
      timestamp: new Date().toISOString(),
      compliance: 'SAMA_CSF_3.3.14'
    });
  }

  static logComplianceViolation(violation: string, userId?: string, data?: any): void {
    logger.error('SAMA_COMPLIANCE_VIOLATION', {
      violation,
      userId,
      data,
      timestamp: new Date().toISOString(),
      compliance: 'SAMA_BNPL_RULES'
    });
  }
}