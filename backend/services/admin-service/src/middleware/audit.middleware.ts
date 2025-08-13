/**
 * RABHAN Audit Middleware
 * Saudi Arabia's Solar BNPL Platform - SAMA Compliance Audit Middleware
 * 
 * Features:
 * - Automatic audit logging
 * - SAMA compliance tracking
 * - Performance monitoring
 * - Security event detection
 */

import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';
import { RiskLevel } from '../types/admin.types';

const auditService = new AuditService();

/**
 * Audit log middleware factory
 */
export const auditLog = (eventType: string, riskLevel: RiskLevel = 'LOW') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store audit context in request
    (req as any).auditContext = {
      eventType,
      riskLevel,
      startTime,
      requestId
    };

    // Override res.json to capture response details
    const originalJson = res.json;
    res.json = function(body: any) {
      const processingTime = Date.now() - startTime;
      
      // Determine final risk level based on response
      let finalRiskLevel = riskLevel;
      if (res.statusCode >= 400) {
        finalRiskLevel = res.statusCode >= 500 ? 'HIGH' : 'MEDIUM';
      }

      // Log the audit event
      auditService.logSecurityEvent({
        admin_id: (req as any).adminId || null,
        event_type: eventType,
        event_action: determineEventAction(req.method, res.statusCode),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        risk_level: finalRiskLevel,
        processing_time_ms: processingTime,
        event_data: {
          request_id: requestId,
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          processing_time_ms: processingTime,
          request_size: req.get('content-length') ? parseInt(req.get('content-length')!) : 0,
          response_size: JSON.stringify(body).length,
          query_params: Object.keys(req.query).length > 0 ? req.query : undefined,
          success: res.statusCode < 400
        }
      }).catch(error => {
        logger.error('Failed to log audit event', error as Error, {
          eventType,
          requestId,
          adminId: (req as any).adminId
        });
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Determine event action based on HTTP method and status code
 */
function determineEventAction(method: string, statusCode: number): string {
  const baseAction = {
    'GET': 'READ',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  }[method.toUpperCase()] || 'unknown';

  if (statusCode >= 400) {
    return `${baseAction.toUpperCase()}_FAILED`;
  } else {
    return `${baseAction.toUpperCase()}_SUCCESS`;
  }
}

/**
 * High-risk operation audit middleware
 */
export const auditHighRisk = (operation: string) => {
  return auditLog(`HIGH_RISK_${operation.toUpperCase()}`, 'HIGH');
};

/**
 * Admin action audit middleware
 */
export const auditAdminAction = (action: string) => {
  return auditLog(`ADMIN_${action.toUpperCase()}`, 'MEDIUM');
};

/**
 * Security event audit middleware
 */
export const auditSecurityEvent = (event: string) => {
  return auditLog(`SECURITY_${event.toUpperCase()}`, 'HIGH');
};

/**
 * SAMA compliance audit middleware
 */
export const auditSAMACompliance = (complianceType: string) => {
  return auditLog(`SAMA_${complianceType.toUpperCase()}`, 'MEDIUM');
};

/**
 * Performance monitoring middleware
 */
export const monitorPerformance = (threshold: number = 2000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    const originalSend = res.send;
    res.send = function(body: any) {
      const processingTime = Date.now() - startTime;
      
      // Log slow requests
      if (processingTime > threshold) {
        logger.warn('Slow request detected', {
          path: req.path,
          method: req.method,
          processing_time_ms: processingTime,
          threshold_ms: threshold,
          admin_id: (req as any).adminId,
          ip: req.ip
        });

        // Log as audit event for SAMA compliance
        auditService.logSecurityEvent({
          admin_id: (req as any).adminId || null,
          event_type: 'PERFORMANCE_ISSUE',
          event_action: 'SLOW_REQUEST',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          risk_level: processingTime > threshold * 2 ? 'HIGH' : 'MEDIUM',
          processing_time_ms: processingTime,
          event_data: {
            path: req.path,
            method: req.method,
            threshold_ms: threshold,
            exceeded_by_ms: processingTime - threshold
          }
        }).catch(error => {
          logger.error('Failed to log performance audit event', error as Error);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Data access audit middleware
 */
export const auditDataAccess = (dataType: string, sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM') => {
  return auditLog(`DATA_ACCESS_${dataType.toUpperCase()}`, sensitivity === 'HIGH' ? 'HIGH' : 'MEDIUM');
};

/**
 * User management audit middleware
 */
export const auditUserManagement = (operation: string) => {
  return auditLog(`USER_MANAGEMENT_${operation.toUpperCase()}`, 'HIGH');
};

/**
 * System configuration audit middleware
 */
export const auditSystemConfig = (configType: string) => {
  return auditLog(`SYSTEM_CONFIG_${configType.toUpperCase()}`, 'HIGH');
};

/**
 * Bulk operation audit middleware
 */
export const auditBulkOperation = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const itemCount = Array.isArray(req.body) ? req.body.length : 
                     req.body?.items?.length || 
                     req.body?.count || 1;

    // Higher risk for large bulk operations
    const riskLevel: RiskLevel = itemCount > 100 ? 'HIGH' : itemCount > 10 ? 'MEDIUM' : 'LOW';
    
    return auditLog(`BULK_${operation.toUpperCase()}`, riskLevel)(req, res, next);
  };
};