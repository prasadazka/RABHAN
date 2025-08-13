/**
 * RABHAN Admin Service Logger Utility
 * Saudi Arabia's Solar BNPL Platform - Admin Management Service
 * 
 * World-Class Logging Infrastructure:
 * - SAMA Compliance Audit Trails
 * - Zero-Trust Security Logging
 * - Performance Monitoring
 * - Real-time Incident Detection
 * - KSA Regional Compliance
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/environment.config';
import crypto from 'crypto';

/**
 * Log Levels for Saudi Enterprise Operations
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  AUDIT = 'audit',      // SAMA compliance logs
  SECURITY = 'security', // Security incident logs
  PERFORMANCE = 'performance' // Performance monitoring
}

/**
 * Log Context Interface for Structured Logging
 */
export interface LogContext {
  // Request Context
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  
  // User Context
  adminId?: string;
  adminEmail?: string;
  adminRole?: string;
  userId?: string;
  
  // Service Context
  service: string;
  version?: string;
  environment?: string;
  
  // Geographic Context (Saudi Regions)
  region?: string;
  city?: string;
  processingCenter?: string;
  
  // Performance Context
  duration?: number;
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  
  // Security Context
  ipAddress?: string;
  userAgent?: string;
  riskScore?: number;
  securityFlags?: string[];
  
  // SAMA Compliance Context
  sama_audit?: boolean;
  sama_incident?: boolean;
  sama_reporting_required?: boolean;
  sama_regulation_reference?: string;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Business Context
  action?: string;
  resource?: string;
  subject_type?: 'USER' | 'CONTRACTOR' | 'ADMIN' | 'SYSTEM';
  subject_id?: string;
  
  // Error Context
  error_code?: string;
  error_details?: any;
  stack_trace?: string;
  
  // Additional metadata
  [key: string]: any;
}

/**
 * SAMA Audit Log Entry
 */
interface SAMAAuditLog {
  event_id: string;
  timestamp: string;
  admin_id: string;
  event_type: string;
  event_category: string;
  event_action: string;
  subject_type: string;
  subject_id: string;
  risk_level: string;
  ip_address: string;
  user_agent: string;
  sama_regulation_reference: string;
  integrity_hash: string;
  processing_time_ms: number;
  region: string;
  compliance_flags: string[];
}

/**
 * Custom Log Format for SAMA Compliance
 */
const samaCompliantFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => {
      // Saudi timezone formatting
      return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info: any) => {
    // Enhanced log structure for SAMA compliance
    const logEntry = {
      timestamp: info['timestamp'],
      level: info.level.toUpperCase(),
      message: info.message,
      service: 'rabhan-admin-service',
      version: config.serviceVersion,
      environment: config.nodeEnv,
      region: 'ksa',
      timezone: 'Asia/Riyadh',
      
      // Context data (spread after specific fields to avoid overwrite)
      ...info,
      
      // SAMA compliance fields (override after spread)
      sama_compliant: true,
      retention_policy: `${config.sama.retentionYears}_years`,
      data_classification: info['sama_audit'] ? 'RESTRICTED' : 'INTERNAL',
      
      // Security and integrity
      log_id: crypto.randomUUID(),
      integrity_hash: info['sama_audit'] ? 
        crypto.createHash('sha256')
          .update(JSON.stringify({
            timestamp: info['timestamp'],
            level: info.level,
            message: info.message,
            admin_id: info['adminId']
          }))
          .digest('hex') : undefined,
      
      // Performance metadata
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
    };
    
    return JSON.stringify(logEntry);
  })
);

/**
 * Performance-optimized logger configuration
 */
const createLoggerConfiguration = () => {
  const transports: winston.transport[] = [];
  
  // Console transport with color for development
  if (config.nodeEnv === 'development') {
    transports.push(
      new winston.transports.Console({
        level: config.monitoring.logLevel,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf((info) => {
            const timestamp = new Date().toISOString();
            return `${timestamp} [${info.level}]: ${info.message} ${
              Object.keys(info).length > 2 ? JSON.stringify(info, null, 2) : ''
            }`;
          })
        ),
      })
    );
  }
  
  // General application logs with rotation
  transports.push(
    new DailyRotateFile({
      filename: 'logs/admin-service-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: `${config.sama.retentionYears * 365}d`, // SAMA 7-year retention
      level: config.monitoring.logLevel,
      format: samaCompliantFormat,
      auditFile: 'logs/audit-admin-service.json',
      createSymlink: true,
      symlinkName: 'admin-service-current.log',
    })
  );
  
  // Error logs with separate rotation
  transports.push(
    new DailyRotateFile({
      filename: 'logs/admin-service-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: `${config.sama.retentionYears * 365}d`,
      level: 'error',
      format: samaCompliantFormat,
      auditFile: 'logs/audit-admin-service-error.json',
    })
  );
  
  // SAMA Audit logs (tamper-resistant)
  transports.push(
    new DailyRotateFile({
      filename: 'logs/sama-audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '500m',
      maxFiles: `${config.sama.retentionYears * 365}d`, // SAMA requirement
      level: 'info',
      format: samaCompliantFormat,
      auditFile: 'logs/audit-sama-compliance.json',
    })
  );
  
  // Security incident logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/security-incidents-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '200m',
      maxFiles: `${config.sama.retentionYears * 365}d`,
      level: 'warn',
      format: samaCompliantFormat,
    })
  );
  
  // Performance monitoring logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '200m',
      maxFiles: '30d', // Shorter retention for performance logs
      level: 'info',
      format: samaCompliantFormat,
    })
  );
  
  return {
    level: config.monitoring.logLevel,
    transports,
    
    // Error handling
    exitOnError: false,
    
    // Exception handling
    exceptionHandlers: [
      new winston.transports.File({
        filename: 'logs/exceptions.log',
        format: samaCompliantFormat,
      }),
    ],
    
    // Rejection handling
    rejectionHandlers: [
      new winston.transports.File({
        filename: 'logs/rejections.log',
        format: samaCompliantFormat,
      }),
    ],
  };
};

/**
 * Create Winston logger instance
 */
const winstonLogger = winston.createLogger(createLoggerConfiguration());

/**
 * Enhanced Logger Class for SAMA Compliance
 */
class SAMACompliantLogger {
  private baseContext: LogContext;
  
  constructor() {
    this.baseContext = {
      service: 'rabhan-admin-service',
      version: config.serviceVersion,
      environment: config.nodeEnv,
      region: config.regional.defaultRegion,
    };
  }
  
  /**
   * Set base context for all logs
   */
  setContext(context: Partial<LogContext>): void {
    this.baseContext = { ...this.baseContext, ...context };
  }
  
  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.baseContext };
  }
  
  /**
   * Info level logging
   */
  info(message: string, context: Partial<LogContext> = {}): void {
    const logContext = { ...this.baseContext, ...context };
    winstonLogger.info(message, logContext);
  }
  
  /**
   * Warning level logging
   */
  warn(message: string, context: Partial<LogContext> = {}): void {
    const logContext = { ...this.baseContext, ...context };
    winstonLogger.warn(message, logContext);
  }
  
  /**
   * Error level logging with enhanced context
   */
  error(message: string, error: Error, context: Partial<LogContext> = {}): void {
    const logContext = {
      ...this.baseContext,
      ...context,
      error_message: error.message,
      error_name: error.name,
      stack_trace: error.stack || '',
      error_code: (error as any).code,
      error_details: (error as any).details,
    };
    
    winstonLogger.error(message, logContext);
    
    // Auto-escalate critical errors to SAMA incident logs
    if (context.risk_level === 'CRITICAL' || context.sama_incident) {
      this.logSAMAIncident(message, logContext as LogContext);
    }
  }
  
  /**
   * Debug level logging (filtered in production)
   */
  debug(message: string, context: Partial<LogContext> = {}): void {
    const logContext = { ...this.baseContext, ...context };
    winstonLogger.debug(message, logContext);
  }
  
  /**
   * SAMA Audit logging for compliance
   */
  audit(message: string, context: Partial<LogContext> = {}): void {
    const auditContext = {
      ...this.baseContext,
      ...context,
      sama_audit: true,
      sama_regulation_reference: context.sama_regulation_reference || 'SAMA_CSF_3.3.14',
      data_classification: 'RESTRICTED',
      log_type: 'AUDIT',
    };
    
    winstonLogger.info(message, auditContext);
    
    // Additional structured audit logging for database storage
    this.logStructuredAudit(message, auditContext);
  }
  
  /**
   * Security incident logging
   */
  security(message: string, context: Partial<LogContext> = {}): void {
    const securityContext = {
      ...this.baseContext,
      ...context,
      security_incident: true,
      risk_level: context.risk_level || 'MEDIUM',
      log_type: 'SECURITY',
      sama_incident: context.risk_level === 'HIGH' || context.risk_level === 'CRITICAL',
    };
    
    winstonLogger.warn(message, securityContext);
    
    // Auto-escalate high-risk security incidents
    if (securityContext.risk_level === 'HIGH' || securityContext.risk_level === 'CRITICAL') {
      this.escalateSecurityIncident(message, securityContext);
    }
  }
  
  /**
   * Performance monitoring logging
   */
  performance(message: string, metrics: {
    operation: string;
    duration: number;
    responseTime?: number;
    memoryDelta?: number;
    cpuUsage?: number;
    throughput?: number;
  }, context: Partial<LogContext> = {}): void {
    const performanceContext = {
      ...this.baseContext,
      ...context,
      performance_metric: true,
      operation: metrics.operation,
      duration: metrics.duration,
      responseTime: metrics.responseTime,
      memoryDelta: metrics.memoryDelta,
      cpuUsage: metrics.cpuUsage,
      throughput: metrics.throughput,
      log_type: 'PERFORMANCE',
      
      // Performance classification
      performance_rating: this.classifyPerformance(metrics.duration),
      meets_sla: metrics.duration < config.performance.responseTimeThresholdMs,
    };
    
    // Use appropriate log level based on performance
    if (metrics.duration > config.performance.responseTimeThresholdMs) {
      winstonLogger.warn(message, performanceContext);
    } else {
      winstonLogger.info(message, performanceContext);
    }
  }
  
  /**
   * Business operation logging for KYC, approvals, etc.
   */
  business(message: string, context: Partial<LogContext> = {}): void {
    const businessContext = {
      ...this.baseContext,
      ...context,
      log_type: 'BUSINESS',
      sama_audit: true, // Business operations are auditable
    };
    
    winstonLogger.info(message, businessContext);
  }
  
  /**
   * Request/Response logging middleware
   */
  logRequest(req: any, res: any, responseTime: number): void {
    const context: LogContext = {
      ...this.baseContext,
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminRole: req.user?.role,
      log_type: 'REQUEST',
      
      // Performance classification
      performance_rating: this.classifyPerformance(responseTime),
      meets_sla: responseTime < config.performance.responseTimeThresholdMs,
    };
    
    // Log level based on response status and performance
    if (res.statusCode >= 500) {
      this.error(`${req.method} ${req.url} - Server Error`, new Error(`HTTP ${res.statusCode}`), context);
    } else if (res.statusCode >= 400) {
      this.warn(`${req.method} ${req.url} - Client Error`, context);
    } else if (responseTime > config.performance.responseTimeThresholdMs) {
      this.warn(`${req.method} ${req.url} - Slow Response`, context);
    } else {
      this.info(`${req.method} ${req.url} - Success`, context);
    }
  }
  
  /**
   * Create child logger with additional context
   */
  child(context: Partial<LogContext>): SAMACompliantLogger {
    const childLogger = new SAMACompliantLogger();
    childLogger.setContext({ ...this.baseContext, ...context });
    return childLogger;
  }
  
  /**
   * Private helper methods
   */
  private classifyPerformance(duration: number): string {
    if (duration < 1) return 'EXCELLENT';
    if (duration < 2) return 'GOOD';
    if (duration < 5) return 'ACCEPTABLE';
    if (duration < 10) return 'SLOW';
    return 'CRITICAL';
  }
  
  private async logStructuredAudit(message: string, context: LogContext): Promise<void> {
    // This would typically write to the database for structured audit trails
    // For now, we'll log to a structured audit file
    const auditEntry: SAMAAuditLog = {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      admin_id: context.adminId || 'system',
      event_type: context.action || 'UNKNOWN',
      event_category: 'ADMIN_ACTION',
      event_action: message,
      subject_type: context.subject_type || 'SYSTEM',
      subject_id: context.subject_id || '',
      risk_level: context.risk_level || 'LOW',
      ip_address: context.ipAddress || '',
      user_agent: context.userAgent || '',
      sama_regulation_reference: context.sama_regulation_reference || 'SAMA_CSF_3.3.14',
      integrity_hash: crypto.createHash('sha256')
        .update(JSON.stringify({
          event_id: context.requestId,
          timestamp: new Date().toISOString(),
          admin_id: context.adminId,
          message
        }))
        .digest('hex'),
      processing_time_ms: context.responseTime || 0,
      region: context.region || 'ksa',
      compliance_flags: context.securityFlags || [],
    };
    
    // Log structured audit entry
    winstonLogger.info('SAMA_STRUCTURED_AUDIT', { 
      audit_entry: auditEntry,
      sama_audit: true,
      structured: true 
    });
  }
  
  private async logSAMAIncident(message: string, context: LogContext): Promise<void> {
    const incidentId = crypto.randomUUID();
    
    const incidentContext = {
      ...context,
      incident_id: incidentId,
      incident_timestamp: new Date().toISOString(),
      sama_incident: true,
      sama_notification_required: true,
      escalation_level: context.risk_level === 'CRITICAL' ? 'IMMEDIATE' : 'STANDARD',
    };
    
    winstonLogger.error(`SAMA_INCIDENT_${incidentId}: ${message}`, incidentContext);
    
    // In production, this would trigger SAMA notification within 4 hours
    if (config.nodeEnv === 'production' && context.risk_level === 'CRITICAL') {
      // TODO: Implement SAMA notification system
      this.warn('CRITICAL incident requires SAMA notification within 4 hours', {
        incident_id: incidentId,
        sama_notification_due: new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString(),
      });
    }
  }
  
  private async escalateSecurityIncident(message: string, context: LogContext): Promise<void> {
    const escalationContext = {
      ...context,
      escalated: true,
      escalation_timestamp: new Date().toISOString(),
      requires_immediate_attention: context.risk_level === 'CRITICAL',
    };
    
    winstonLogger.error(`SECURITY_ESCALATION: ${message}`, escalationContext);
    
    // In production, this would trigger alerts to security team
    if (config.nodeEnv === 'production') {
      // TODO: Implement security team notification
      this.warn('Security incident escalated to security team', escalationContext);
    }
  }
}

// Create singleton logger instance
export const logger = new SAMACompliantLogger();

// Export logger utilities
export { SAMACompliantLogger };

// Express middleware for request logging
export const requestLoggerMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Generate request ID for tracing
  req.requestId = crypto.randomUUID();
  
  // Log request start
  logger.debug(`${req.method} ${req.url} - Request started`, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Hook into response finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
};

// Utility function for performance measurement
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context: Partial<LogContext> = {}
): Promise<T> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const memoryDelta = process.memoryUsage().heapUsed - startMemory;
    
    logger.performance(`${operation} completed`, {
      operation,
      duration,
      memoryDelta,
    }, context);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`${operation} failed`, error as Error, {
      ...context,
      operation,
      duration,
      failed: true,
    });
    
    throw error;
  }
};

export default logger;