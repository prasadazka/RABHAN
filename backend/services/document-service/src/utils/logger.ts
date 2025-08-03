import winston from 'winston';
import { config } from '../config/environment.config';

// Custom log levels for SAMA compliance
const samaLogLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
  sama: 7, // Custom level for SAMA compliance events
};

// Custom colors for log levels
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
  sama: 'brightMagenta',
};

winston.addColors(logColors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label'],
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level}] ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      log += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  logFormat,
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for development
if (config.isDevelopment || config.logging.enableConsole) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transports for production
if (config.isProduction) {
  // General log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/document-service.log',
      format: jsonFormat,
      level: config.logging.level,
      maxsize: parseInt(config.logging.maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/document-service-error.log',
      format: jsonFormat,
      level: 'error',
      maxsize: parseInt(config.logging.maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    })
  );

  // SAMA compliance log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/sama-compliance.log',
      format: jsonFormat,
      level: 'sama',
      maxsize: parseInt(config.logging.maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles: config.logging.maxFiles,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  levels: samaLogLevels,
  level: config.logging.level,
  format: config.logging.format === 'json' ? jsonFormat : logFormat,
  transports,
  exitOnError: false,
  
  // Default metadata
  defaultMeta: {
    service: config.server.serviceName,
    environment: config.env,
    timestamp: new Date().toISOString(),
  },
});

// SAMA Compliance Logger
export class SAMALogger {
  private static auditQueue: any[] = [];
  private static isProcessing = false;

  static logDocumentEvent(
    eventType: 'DOCUMENT_UPLOAD' | 'DOCUMENT_DOWNLOAD' | 'DOCUMENT_DELETE' | 'DOCUMENT_APPROVE' | 'DOCUMENT_REJECT',
    documentId: string,
    userId: string,
    metadata: any = {}
  ): void {
    const auditEvent = {
      id: this.generateEventId(),
      eventType,
      category: 'DOCUMENT_MANAGEMENT',
      severity: this.getSeverityLevel(eventType),
      timestamp: new Date().toISOString(),
      
      // Core identifiers
      documentId,
      userId,
      
      // Event data
      eventData: {
        ...metadata,
        complianceFramework: 'SAMA_CSF',
        controlReference: this.mapEventToSAMAControl(eventType),
        auditTrail: true,
      },
      
      // SAMA compliance
      samaControlReference: this.mapEventToSAMAControl(eventType),
      complianceStatus: 'compliant',
      retentionPeriod: 7 * 365, // 7 years in days
      
      // Request context
      correlationId: this.generateCorrelationId(),
      sessionId: metadata.sessionId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    };

    // Log to winston
    logger.log('sama', 'SAMA Document Event', auditEvent);

    // Queue for async processing
    this.auditQueue.push(auditEvent);
    this.processAuditQueue();
  }

  static logSecurityEvent(
    eventType: 'VIRUS_DETECTED' | 'INVALID_FILE_TYPE' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_EXCEEDED' | 'ENCRYPTION_FAILURE',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata: any = {}
  ): void {
    const securityEvent = {
      id: this.generateEventId(),
      eventType,
      category: 'SECURITY',
      severity,
      timestamp: new Date().toISOString(),
      
      // Event data
      eventData: {
        ...metadata,
        securityFramework: 'SAMA_CSF_SECURITY',
        immediateAction: severity === 'CRITICAL' || severity === 'HIGH',
      },
      
      // SAMA compliance
      samaControlReference: this.mapSecurityEventToSAMAControl(eventType),
      complianceStatus: 'violation',
      notificationRequired: severity === 'CRITICAL' || severity === 'HIGH',
      
      // Request context
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
    };

    // Log to winston
    logger.log('sama', 'SAMA Security Event', securityEvent);

    // Immediate notification for critical events
    if (severity === 'CRITICAL') {
      this.sendImmediateNotification(securityEvent);
    }

    // Queue for async processing
    this.auditQueue.push(securityEvent);
    this.processAuditQueue();
  }

  static logComplianceEvent(
    eventType: 'DATA_RETENTION_POLICY' | 'ENCRYPTION_KEY_ROTATION' | 'ACCESS_CONTROL_UPDATE' | 'AUDIT_LOG_EXPORT',
    controlReference: string,
    metadata: any = {}
  ): void {
    const complianceEvent = {
      id: this.generateEventId(),
      eventType,
      category: 'COMPLIANCE',
      severity: 'MEDIUM',
      timestamp: new Date().toISOString(),
      
      // Event data
      eventData: {
        ...metadata,
        complianceFramework: 'SAMA_CSF',
        controlReference,
        auditTrail: true,
      },
      
      // SAMA compliance
      samaControlReference: controlReference,
      complianceStatus: 'compliant',
      retentionPeriod: 7 * 365, // 7 years in days
      
      // Request context
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
    };

    // Log to winston
    logger.log('sama', 'SAMA Compliance Event', complianceEvent);

    // Queue for async processing
    this.auditQueue.push(complianceEvent);
    this.processAuditQueue();
  }

  static logAccessEvent(
    eventType: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'PERMISSION_ESCALATION' | 'ROLE_CHANGE',
    userId: string,
    resourceId: string,
    metadata: any = {}
  ): void {
    const accessEvent = {
      id: this.generateEventId(),
      eventType,
      category: 'ACCESS_CONTROL',
      severity: eventType === 'ACCESS_DENIED' ? 'MEDIUM' : 'LOW',
      timestamp: new Date().toISOString(),
      
      // Core identifiers
      userId,
      resourceId,
      
      // Event data
      eventData: {
        ...metadata,
        accessControlFramework: 'SAMA_CSF_ACCESS',
        rbacEnabled: true,
      },
      
      // SAMA compliance
      samaControlReference: 'CSF-3.3.5-ACCESS',
      complianceStatus: eventType === 'ACCESS_DENIED' ? 'violation' : 'compliant',
      
      // Request context
      correlationId: this.generateCorrelationId(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      timestamp: new Date().toISOString(),
    };

    // Log to winston
    logger.log('sama', 'SAMA Access Event', accessEvent);

    // Queue for async processing
    this.auditQueue.push(accessEvent);
    this.processAuditQueue();
  }

  private static async processAuditQueue(): Promise<void> {
    if (this.isProcessing || this.auditQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches
      const batchSize = 10;
      const batch = this.auditQueue.splice(0, batchSize);

      for (const event of batch) {
        await this.processAuditEvent(event);
      }

      // Schedule next batch if queue is not empty
      if (this.auditQueue.length > 0) {
        setTimeout(() => {
          this.isProcessing = false;
          this.processAuditQueue();
        }, 100);
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      logger.error('SAMA audit queue processing failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queueLength: this.auditQueue.length,
      });
      this.isProcessing = false;
    }
  }

  private static async processAuditEvent(event: any): Promise<void> {
    try {
      // Store in database (will be implemented in document service)
      // await this.storeAuditEvent(event);

      // Send to SAMA reporting system if required
      if (event.notificationRequired) {
        await this.sendSAMANotification(event);
      }

      // Export to external systems if configured
      if (config.sama.reportingEndpoint) {
        await this.exportToSAMASystem(event);
      }
    } catch (error) {
      logger.error('SAMA audit event processing failed:', {
        eventId: event.id,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private static async sendSAMANotification(event: any): Promise<void> {
    try {
      // Implementation for SAMA notification system
      logger.warn('SAMA notification required:', {
        eventId: event.id,
        eventType: event.eventType,
        severity: event.severity,
        timestamp: event.timestamp,
      });

      // In production, this would send to SAMA notification endpoint
      if (config.sama.notificationEndpoint) {
        // await fetch(config.sama.notificationEndpoint, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(event),
        // });
      }
    } catch (error) {
      logger.error('SAMA notification failed:', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private static async sendImmediateNotification(event: any): Promise<void> {
    try {
      logger.error('CRITICAL SAMA SECURITY EVENT:', {
        eventId: event.id,
        eventType: event.eventType,
        severity: event.severity,
        timestamp: event.timestamp,
        requiresImmediateAttention: true,
      });

      // In production, this would trigger immediate alerts
      await this.sendSAMANotification(event);
    } catch (error) {
      logger.error('Critical SAMA notification failed:', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private static async exportToSAMASystem(event: any): Promise<void> {
    try {
      // Export to external SAMA compliance system
      logger.debug('Exporting to SAMA system:', {
        eventId: event.id,
        eventType: event.eventType,
      });

      // Implementation would connect to SAMA reporting API
    } catch (error) {
      logger.error('SAMA system export failed:', {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private static generateEventId(): string {
    return `sama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getSeverityLevel(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severityMap: { [key: string]: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } = {
      'DOCUMENT_UPLOAD': 'LOW',
      'DOCUMENT_DOWNLOAD': 'LOW',
      'DOCUMENT_DELETE': 'MEDIUM',
      'DOCUMENT_APPROVE': 'MEDIUM',
      'DOCUMENT_REJECT': 'MEDIUM',
      'VIRUS_DETECTED': 'CRITICAL',
      'INVALID_FILE_TYPE': 'MEDIUM',
      'UNAUTHORIZED_ACCESS': 'HIGH',
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'ENCRYPTION_FAILURE': 'HIGH',
    };

    return severityMap[eventType] || 'MEDIUM';
  }

  private static mapEventToSAMAControl(eventType: string): string {
    const controlMap: { [key: string]: string } = {
      'DOCUMENT_UPLOAD': 'CSF-3.3.3-ASSET-MANAGEMENT',
      'DOCUMENT_DOWNLOAD': 'CSF-3.3.3-ASSET-MANAGEMENT',
      'DOCUMENT_DELETE': 'CSF-3.3.3-ASSET-MANAGEMENT',
      'DOCUMENT_APPROVE': 'CSF-3.3.5-ACCESS-CONTROL',
      'DOCUMENT_REJECT': 'CSF-3.3.5-ACCESS-CONTROL',
    };

    return controlMap[eventType] || 'CSF-3.3.1-GENERAL';
  }

  private static mapSecurityEventToSAMAControl(eventType: string): string {
    const controlMap: { [key: string]: string } = {
      'VIRUS_DETECTED': 'CSF-3.3.7-MALWARE-PROTECTION',
      'INVALID_FILE_TYPE': 'CSF-3.3.6-APPLICATION-SECURITY',
      'UNAUTHORIZED_ACCESS': 'CSF-3.3.5-ACCESS-CONTROL',
      'RATE_LIMIT_EXCEEDED': 'CSF-3.3.6-APPLICATION-SECURITY',
      'ENCRYPTION_FAILURE': 'CSF-3.3.9-CRYPTOGRAPHY',
    };

    return controlMap[eventType] || 'CSF-3.3.1-GENERAL';
  }
}

// Helper function to create request-specific logger
export function createRequestLogger(requestId: string, userId?: string): winston.Logger {
  return logger.child({
    requestId,
    userId,
    timestamp: new Date().toISOString(),
  });
}

// Helper function to log API requests
export function logApiRequest(
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  requestId: string,
  userId?: string
): void {
  logger.http('API Request', {
    method,
    url,
    statusCode,
    responseTime,
    requestId,
    userId,
    timestamp: new Date().toISOString(),
  });
}

// Helper function to log database queries
export function logDatabaseQuery(
  query: string,
  parameters: any[],
  duration: number,
  rowCount: number,
  requestId?: string
): void {
  logger.debug('Database Query', {
    query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
    parametersCount: parameters.length,
    duration,
    rowCount,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

export default logger;