import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

// Extended Request interface to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    role: string;
    isAdmin: boolean;
    isVerified: boolean;
    permissions: string[];
  };
  requestId?: string;
}

/**
 * JWT Authentication middleware
 * Validates JWT tokens and extracts user information
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required',
          timestamp: new Date()
        }
      });
      return;
    }
    
    // Verify JWT token
    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Invalid token attempt', {
          error: err.message,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          token_expired: err.name === 'TokenExpiredError',
          event_type: 'authentication_failure'
        });
        
        const errorCode = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        const errorMessage = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid access token';
        
        res.status(401).json({
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            timestamp: new Date()
          }
        });
        return;
      }
      
      // Add user information to request
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role || 'user',
        isAdmin: decoded.role === 'admin' || decoded.isAdmin || false,
        isVerified: decoded.isVerified || false,
        permissions: decoded.permissions || []
      };
      
      // Generate request ID for tracking
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.debug('User authenticated successfully', {
        user_id: req.user.id,
        role: req.user.role,
        request_id: req.requestId,
        ip_address: req.ip,
        event_type: 'authentication_success'
      });
      
      next();
    });
    
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      event_type: 'authentication_error'
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication processing error',
        timestamp: new Date()
      }
    });
  }
};

/**
 * Optional authentication middleware
 * Extracts user information if token is present, but doesn't require it
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      // No token provided, continue without user info
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
      return;
    }
    
    // Verify token if provided
    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (!err && decoded) {
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          phone: decoded.phone,
          role: decoded.role || 'user',
          isAdmin: decoded.role === 'admin' || decoded.isAdmin || false,
          isVerified: decoded.isVerified || false,
          permissions: decoded.permissions || []
        };
      }
      
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
    });
    
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip_address: req.ip
    });
    
    // Continue without authentication on error
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    next();
  }
};

/**
 * Admin authorization middleware
 * Requires user to be authenticated and have admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date()
      }
    });
    return;
  }
  
  if (!req.user.isAdmin) {
    logger.warn('Unauthorized admin access attempt', {
      user_id: req.user.id,
      role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      event_type: 'authorization_failure'
    });
    
    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
        timestamp: new Date()
      }
    });
    return;
  }
  
  next();
};

/**
 * Permission-based authorization middleware
 * Requires user to have specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date()
        }
      });
      return;
    }
    
    if (!req.user.permissions.includes(permission) && !req.user.isAdmin) {
      logger.warn('Unauthorized permission access attempt', {
        user_id: req.user.id,
        required_permission: permission,
        user_permissions: req.user.permissions,
        ip_address: req.ip,
        event_type: 'permission_denied'
      });
      
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${permission}' required`,
          timestamp: new Date()
        }
      });
      return;
    }
    
    next();
  };
};

/**
 * Rate limiting based on user
 * Different limits for authenticated vs anonymous users
 */
export const userBasedRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // This is a placeholder for user-based rate limiting
  // In production, you would implement Redis-based rate limiting here
  // with different limits for authenticated users vs anonymous users
  
  const rateLimitKey = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  const limit = req.user ? 1000 : 100; // Higher limit for authenticated users
  
  // TODO: Implement actual rate limiting logic with Redis
  logger.debug('Rate limit check', {
    rate_limit_key: rateLimitKey,
    limit,
    user_id: req.user?.id,
    ip_address: req.ip
  });
  
  next();
};

/**
 * Contractor ownership middleware
 * Ensures user can only access their own contractor data
 */
export const requireContractorOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date()
      }
    });
    return;
  }
  
  // Admin can access any contractor data
  if (req.user.isAdmin) {
    next();
    return;
  }
  
  // For regular users, they can only access their own data
  // The actual ownership check should be done in the service layer
  // This middleware just ensures basic authentication
  next();
};

/**
 * SAMA compliance logging middleware
 * Logs all access attempts for audit purposes
 */
export const logAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log the request
  logger.info('API access', {
    method: req.method,
    url: req.originalUrl,
    user_id: req.user?.id,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    request_id: req.requestId,
    event_type: 'api_access',
    audit_trail: true
  });
  
  // Log the response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('API response', {
      method: req.method,
      url: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id,
      ip_address: req.ip,
      request_id: req.requestId,
      event_type: 'api_response',
      audit_trail: true
    });
  });
  
  next();
};