import winston from 'winston';

// Load config safely with fallback
let config: any;
try {
  config = require('../config/environment.config').config;
} catch (error) {
  config = { LOG_LEVEL: 'info', NODE_ENV: 'development' };
}

// SAMA-compliant logging with enhanced security and audit trails
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service = 'contractor-service', ...meta } = info;
    
    // Enhanced log format for SAMA compliance
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service,
      message,
      ...meta,
      
      // Add compliance tracking
      compliance_context: {
        log_id: generateLogId(),
        retention_required: level === 'error' || meta.compliance_event,
        sama_relevant: !!(meta.compliance_event || meta.regulatory_impact),
        pii_sanitized: true
      }
    };
    
    return JSON.stringify(logEntry);
  })
);

// Generate unique log ID for tracking
const generateLogId = (): string => {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'contractor-service',
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for general logs
    new winston.transports.File({
      filename: 'logs/contractor-service.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Error log file
    new winston.transports.File({
      filename: 'logs/contractor-service-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // SAMA audit log file (for compliance events)
    new winston.transports.File({
      filename: 'logs/sama-audit.log',
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 100, // Long retention for SAMA compliance
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => {
          // Only log SAMA-relevant events
          if (info.compliance_event || info.regulatory_impact || info.audit_trail) {
            return JSON.stringify({
              ...info,
              sama_compliance: true,
              retention_period: '7_years'
            });
          }
          return ''; // Skip non-compliance logs
        })
      )
    })
  ],
  
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ],
  
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

// SAMA-specific logging functions
export const auditLogger = {
  // Log contractor registration events
  contractorRegistration: (contractorId: string, userId: string, metadata: any) => {
    logger.info('Contractor registration initiated', {
      contractor_id: contractorId,
      user_id: userId,
      event_type: 'contractor_registration',
      compliance_event: true,
      regulatory_impact: true,
      audit_trail: true,
      metadata: sanitizeMetadata(metadata)
    });
  },
  
  // Log verification events
  verification: (contractorId: string, verificationType: string, status: string, adminId: string) => {
    logger.info('Contractor verification event', {
      contractor_id: contractorId,
      verification_type: verificationType,
      verification_status: status,
      admin_id: adminId,
      event_type: 'contractor_verification',
      compliance_event: true,
      regulatory_impact: true,
      audit_trail: true
    });
  },
  
  // Log document uploads
  documentUpload: (contractorId: string, documentType: string, documentId: string) => {
    logger.info('Contractor document uploaded', {
      contractor_id: contractorId,
      document_type: documentType,
      document_id: documentId,
      event_type: 'document_upload',
      compliance_event: true,
      audit_trail: true
    });
  },
  
  // Log status changes
  statusChange: (contractorId: string, oldStatus: string, newStatus: string, changedBy: string) => {
    logger.info('Contractor status changed', {
      contractor_id: contractorId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      event_type: 'status_change',
      compliance_event: true,
      regulatory_impact: true,
      audit_trail: true
    });
  },
  
  // Log data access
  dataAccess: (contractorId: string, accessedBy: string, accessType: string) => {
    logger.info('Contractor data accessed', {
      contractor_id: contractorId,
      accessed_by: accessedBy,
      access_type: accessType,
      event_type: 'data_access',
      compliance_event: true,
      audit_trail: true
    });
  },
  
  // Log security events
  securityEvent: (event: string, severity: string, metadata: any) => {
    logger.warn('Security event detected', {
      security_event: event,
      severity,
      event_type: 'security_event',
      compliance_event: true,
      regulatory_impact: severity === 'high' || severity === 'critical',
      audit_trail: true,
      metadata: sanitizeMetadata(metadata)
    });
  }
};

// Performance monitoring logger
export const performanceLogger = {
  // Log slow operations
  slowOperation: (operation: string, duration: number, metadata?: any) => {
    logger.warn('Slow operation detected', {
      operation,
      duration_ms: duration,
      event_type: 'performance_issue',
      metadata: sanitizeMetadata(metadata)
    });
  },
  
  // Log API response times
  apiResponse: (endpoint: string, method: string, statusCode: number, duration: number) => {
    const level = duration > 1000 ? 'warn' : 'info';
    logger.log(level, 'API response', {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
      event_type: 'api_response'
    });
  },
  
  // Log database query performance
  databaseQuery: (query: string, duration: number, rows?: number) => {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger.log(level, 'Database query executed', {
      query_type: query.split(' ')[0].toLowerCase(),
      duration_ms: duration,
      rows_affected: rows,
      event_type: 'database_query'
    });
  }
};

// Sanitize metadata to remove PII
const sanitizeMetadata = (metadata: any): any => {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }
  
  const sanitized = { ...metadata };
  
  // Remove or mask sensitive fields
  const sensitiveFields = [
    'password', 'email', 'phone', 'national_id', 'iban',
    'credit_card', 'ssn', 'passport', 'license'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  });
  
  return sanitized;
};

// Error logging with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    error_message: error.message,
    error_stack: error.stack,
    error_name: error.name,
    context: sanitizeMetadata(context),
    event_type: 'application_error'
  });
};

// Request logging middleware helper
export const logRequest = (req: any, res: any, startTime: number) => {
  const duration = Date.now() - startTime;
  const { method, url, ip, headers } = req;
  
  logger.info('HTTP request processed', {
    method,
    url,
    status_code: res.statusCode,
    duration_ms: duration,
    ip_address: ip,
    user_agent: headers['user-agent'],
    event_type: 'http_request',
    audit_trail: true
  });
};

// Create log directories if they don't exist
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
  mkdirSync('logs', { recursive: true });
}

export default logger;