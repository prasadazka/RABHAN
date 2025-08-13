/**
 * RABHAN Marketplace Service - Advanced Logging System
 * SAMA Compliant Audit Logging | Zero-Trust Security
 */

import winston from 'winston';
import path from 'path';
import { env, envManager } from '../config/environment.config';

// Log levels aligned with SAMA requirements
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// SAMA Compliance log categories
export enum SAMALogCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  FINANCIAL_TRANSACTION = 'FINANCIAL_TRANSACTION',
  SECURITY_EVENT = 'SECURITY_EVENT',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  SYSTEM_PERFORMANCE = 'SYSTEM_PERFORMANCE',
  AUDIT_TRAIL = 'AUDIT_TRAIL'
}

// Enhanced log metadata for SAMA compliance
interface SAMALogMetadata {
  userId?: string;
  sessionId?: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string;
  category?: SAMALogCategory;
  complianceFramework?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionType?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  resourceType?: string;
  resourceId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  errorCode?: string;
  port?: number;
  host?: string;
  signal?: string;
  performanceMetrics?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  securityContext?: {
    encrypted?: boolean;
    authenticated?: boolean;
    authorized?: boolean;
  };
  [key: string]: any; // Allow additional properties
}

class SAMALogger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string = env.SERVICE_NAME) {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs');
    
    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    // Add colorize for development
    if (envManager.isDevelopment()) {
      formats.push(winston.format.colorize());
      formats.push(winston.format.printf((info) => {
        return `${info.timestamp} [${info.level}] ${info.message}`;
      }));
    }

    const transports: winston.transport[] = [
      // Console transport (always enabled)
      new winston.transports.Console({
        level: env.LOG_LEVEL,
        format: winston.format.combine(...formats)
      })
    ];

    // File transports (configurable)
    if (env.LOG_FILE_ENABLED) {
      // General application logs
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, `${this.serviceName}.log`),
          level: 'info',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Error logs (separate file for monitoring)
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, `${this.serviceName}-error.log`),
          level: 'error',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // SAMA audit logs (separate file for compliance)
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, `sama-audit-${this.serviceName}.log`),
          level: 'info',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 50, // Retain for 7 years (SAMA requirement)
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf((info) => {
              // Only SAMA-related logs in audit file
              if (info.category && Object.values(SAMALogCategory).includes(info.category as SAMALogCategory)) {
                return JSON.stringify({
                  ...info,
                  timestamp: info.timestamp,
                  level: info.level,
                  message: info.message,
                  service: this.serviceName
                });
              }
              return '';
            })
          )
        })
      );

      // Performance logs (for optimization)
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, `performance-${this.serviceName}.log`),
          level: 'info',
          maxsize: 50 * 1024 * 1024,
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf((info) => {
              // Only performance-related logs
              if (info.performanceMetrics || info.category === SAMALogCategory.SYSTEM_PERFORMANCE) {
                return JSON.stringify(info);
              }
              return '';
            })
          )
        })
      );
    }

    return winston.createLogger({
      level: env.LOG_LEVEL,
      levels: LOG_LEVELS,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: {
        service: this.serviceName,
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      // Handle uncaught exceptions and rejections
      exceptionHandlers: env.LOG_FILE_ENABLED ? [
        new winston.transports.File({ 
          filename: path.join(logDir, `exceptions-${this.serviceName}.log`) 
        })
      ] : [],
      rejectionHandlers: env.LOG_FILE_ENABLED ? [
        new winston.transports.File({ 
          filename: path.join(logDir, `rejections-${this.serviceName}.log`) 
        })
      ] : []
    });
  }

  /**
   * Enhanced logging methods with SAMA compliance
   */

  public info(message: string, metadata?: SAMALogMetadata): void {
    this.logger.info(message, this.enrichMetadata(metadata));
  }

  public error(message: string, error?: Error | unknown, metadata?: SAMALogMetadata): void {
    const enrichedMetadata = this.enrichMetadata(metadata);
    
    if (error instanceof Error) {
      enrichedMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error) {
      enrichedMetadata.error = error;
    }

    this.logger.error(message, enrichedMetadata);
  }

  public warn(message: string, metadata?: SAMALogMetadata): void {
    this.logger.warn(message, this.enrichMetadata(metadata));
  }

  public debug(message: string, metadata?: SAMALogMetadata): void {
    this.logger.debug(message, this.enrichMetadata(metadata));
  }

  public http(message: string, metadata?: SAMALogMetadata): void {
    this.logger.http(message, this.enrichMetadata(metadata));
  }

  /**
   * SAMA-specific audit logging methods
   */

  public auditSecurity(
    action: string, 
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PROCESSING', 
    metadata: SAMALogMetadata = {}
  ): void {
    this.logger.info(`SECURITY_AUDIT: ${action} - ${result}`, this.enrichMetadata({
      ...metadata,
      category: SAMALogCategory.SECURITY_EVENT,
      complianceFramework: ['SAMA_CSF_3.3.14', 'SAMA_CSF_3.3.15'],
      auditRequired: true
    }));
  }

  public auditAuthentication(
    userId: string,
    action: string,
    result: 'SUCCESS' | 'FAILURE',
    metadata: SAMALogMetadata = {}
  ): void {
    this.logger.info(`AUTH_AUDIT: User ${userId} ${action} - ${result}`, this.enrichMetadata({
      ...metadata,
      userId,
      category: SAMALogCategory.AUTHENTICATION,
      complianceFramework: ['SAMA_CSF_3.3.5'],
      auditRequired: true
    }));
  }

  public auditDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    metadata: SAMALogMetadata = {}
  ): void {
    this.logger.info(`DATA_ACCESS_AUDIT: User ${userId} ${action} ${resourceType}:${resourceId}`, this.enrichMetadata({
      ...metadata,
      userId,
      resourceType,
      resourceId,
      actionType: action,
      category: SAMALogCategory.DATA_ACCESS,
      complianceFramework: ['SAMA_CSF_3.3.3'],
      auditRequired: true
    }));
  }

  public auditCompliance(
    framework: string,
    violation: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata: SAMALogMetadata = {}
  ): void {
    this.logger.warn(`COMPLIANCE_VIOLATION: ${framework} - ${violation}`, this.enrichMetadata({
      ...metadata,
      category: SAMALogCategory.COMPLIANCE_VIOLATION,
      complianceFramework: [framework],
      riskLevel: severity,
      auditRequired: true
    }));
  }

  public auditPerformance(
    operation: string,
    duration: number,
    metadata: SAMALogMetadata = {}
  ): void {
    const level = duration > 2000 ? 'warn' : 'info'; // Warn if >2s (SAMA requirement)
    
    this.logger[level](`PERFORMANCE: ${operation} completed in ${duration}ms`, this.enrichMetadata({
      ...metadata,
      category: SAMALogCategory.SYSTEM_PERFORMANCE,
      performanceMetrics: { duration }
    }));
  }

  /**
   * Enrich metadata with standard fields
   */
  private enrichMetadata(metadata: SAMALogMetadata = {}): any {
    return {
      ...metadata,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: env.NODE_ENV,
      timezone: env.TIMEZONE,
      // Add trace ID for request correlation
      traceId: metadata.requestId || this.generateTraceId()
    };
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get logger instance for external use
   */
  public getInstance(): winston.Logger {
    return this.logger;
  }
}

// Create logger factory function
export function createLogger(serviceName?: string): SAMALogger {
  return new SAMALogger(serviceName);
}

// Export default logger instance
export const logger = new SAMALogger();

// Export types for external use
export type { SAMALogMetadata };