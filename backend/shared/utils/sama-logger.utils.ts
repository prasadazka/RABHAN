interface SAMAEventMetadata {
  userId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  service: string;
  [key: string]: any;
}

interface SAMAEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTH' | 'SECURITY' | 'COMPLIANCE' | 'AUDIT' | 'BUSINESS';
  userId?: string;
  metadata: SAMAEventMetadata;
}

export class SAMALoggerUtils {
  
  static createEvent(
    eventType: string,
    category: SAMAEvent['category'],
    severity: SAMAEvent['severity'],
    metadata: Partial<SAMAEventMetadata>,
    userId?: string
  ): SAMAEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      category,
      severity,
      userId,
      metadata: {
        service: process.env.SERVICE_NAME || 'unknown',
        ...metadata
      }
    };
  }

  static logAuthEvent(
    eventType: string,
    userId?: string,
    metadata: Partial<SAMAEventMetadata> = {}
  ): SAMAEvent {
    const event = this.createEvent(
      eventType,
      'AUTH',
      this.getAuthEventSeverity(eventType),
      metadata,
      userId
    );
    
    this.writeToAuditLog(event);
    return event;
  }

  static logSecurityEvent(
    eventType: string,
    severity: SAMAEvent['severity'],
    metadata: Partial<SAMAEventMetadata> = {},
    userId?: string
  ): SAMAEvent {
    const event = this.createEvent(
      eventType,
      'SECURITY',
      severity,
      metadata,
      userId
    );
    
    this.writeToAuditLog(event);
    
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      this.triggerSecurityAlert(event);
    }
    
    return event;
  }

  static logComplianceEvent(
    eventType: string,
    metadata: Partial<SAMAEventMetadata> = {},
    userId?: string
  ): SAMAEvent {
    const event = this.createEvent(
      eventType,
      'COMPLIANCE',
      'MEDIUM',
      metadata,
      userId
    );
    
    this.writeToAuditLog(event);
    return event;
  }

  static logComplianceViolation(
    violationType: string,
    userId?: string,
    metadata: Partial<SAMAEventMetadata> = {}
  ): SAMAEvent {
    const event = this.createEvent(
      `COMPLIANCE_VIOLATION_${violationType}`,
      'COMPLIANCE',
      'HIGH',
      {
        violationType,
        ...metadata
      },
      userId
    );
    
    this.writeToAuditLog(event);
    this.triggerComplianceAlert(event);
    
    return event;
  }

  static logBusinessEvent(
    eventType: string,
    userId?: string,
    metadata: Partial<SAMAEventMetadata> = {}
  ): SAMAEvent {
    const event = this.createEvent(
      eventType,
      'BUSINESS',
      'LOW',
      metadata,
      userId
    );
    
    this.writeToAuditLog(event);
    return event;
  }

  static logBNPLEvent(
    eventType: string,
    amount: number,
    userId: string,
    metadata: Partial<SAMAEventMetadata> = {}
  ): SAMAEvent {
    const severity = amount > 4000 ? 'HIGH' : amount > 2000 ? 'MEDIUM' : 'LOW';
    
    const event = this.createEvent(
      eventType,
      'BUSINESS',
      severity,
      {
        amount,
        currency: 'SAR',
        bnplCompliance: 'SAMA_BNPL_RULES',
        ...metadata
      },
      userId
    );
    
    this.writeToAuditLog(event);
    
    if (amount >= 5000) {
      this.logComplianceViolation('BNPL_LIMIT_EXCEEDED', userId, {
        amount,
        limit: 5000,
        ...metadata
      });
    }
    
    return event;
  }

  private static generateEventId(): string {
    return `sama_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private static getAuthEventSeverity(eventType: string): SAMAEvent['severity'] {
    const highSeverityEvents = [
      'LOGIN_FAILED',
      'ACCOUNT_LOCKED',
      'SUSPICIOUS_LOGIN',
      'PASSWORD_RESET_ABUSE',
      'MFA_BYPASS_ATTEMPT'
    ];
    
    const mediumSeverityEvents = [
      'USER_REGISTRATION',
      'PASSWORD_CHANGED',
      'LOGOUT',
      'TOKEN_REFRESH'
    ];
    
    if (highSeverityEvents.some(event => eventType.includes(event))) {
      return 'HIGH';
    }
    
    if (mediumSeverityEvents.some(event => eventType.includes(event))) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private static writeToAuditLog(event: SAMAEvent): void {
    const logEntry = {
      timestamp: event.timestamp,
      level: 'AUDIT',
      message: `SAMA Event: ${event.eventType}`,
      data: event
    };
    
    console.log(JSON.stringify(logEntry));
    
    // In production, this would write to secure audit storage
    // that meets SAMA tamper-proof requirements
  }

  private static triggerSecurityAlert(event: SAMAEvent): void {
    // Implementation would send real-time alerts
    // to security team for HIGH/CRITICAL events
    console.warn(`SECURITY ALERT: ${event.eventType}`, event);
  }

  private static triggerComplianceAlert(event: SAMAEvent): void {
    // Implementation would notify compliance team
    // and potentially auto-report to SAMA if required
    console.error(`COMPLIANCE VIOLATION: ${event.eventType}`, event);
  }

  static getBNPLComplianceMetrics(timeframe: 'daily' | 'weekly' | 'monthly') {
    // This would integrate with actual metrics collection
    // for SAMA monthly reporting requirements
    return {
      timeframe,
      timestamp: new Date().toISOString(),
      metrics: {
        totalTransactions: 0,
        totalVolume: 0,
        averageAmount: 0,
        complianceViolations: 0,
        activeUsers: 0
      }
    };
  }

  static generateSAMAReport(month: number, year: number) {
    // Implementation would generate comprehensive
    // SAMA compliance report with all required metrics
    return {
      reportId: `SAMA_${year}_${month.toString().padStart(2, '0')}`,
      period: `${year}-${month.toString().padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      compliance: {
        bnplLimits: true,
        dataResidency: true,
        auditTrail: true,
        securityControls: true
      }
    };
  }
}