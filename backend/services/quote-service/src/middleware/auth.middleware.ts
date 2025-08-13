import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/environment.config';
import { logger, auditLogger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'contractor' | 'admin';
    verified: boolean;
  };
}

// JWT Authentication Middleware
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      auditLogger.security('AUTH_TOKEN_MISSING', {
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        path: req.path
      });
      
      res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
      return;
    }

    // TEMPORARY: Allow admin mock tokens for development
    if (token.startsWith('mock-jwt-token-')) {
      req.user = {
        id: 'admin-1',
        email: 'admin@rabhan.sa',
        role: 'admin',
        verified: true
      };
      
      logger.debug('Admin mock token accepted for development', {
        user_id: req.user.id,
        role: req.user.role,
        path: req.path
      });
      
      next();
      return;
    }

    jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
      if (err) {
        auditLogger.security('AUTH_TOKEN_INVALID', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          error: err.message
        });
        
        res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: (decoded.role || '').toLowerCase() as 'user' | 'contractor' | 'admin',
        verified: decoded.verified || false
      };

      logger.debug('User authenticated successfully', {
        user_id: req.user.id,
        role: req.user.role,
        path: req.path
      });

      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    auditLogger.security('AUTH_MIDDLEWARE_ERROR', {
      ip: req.ip,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: Array<'user' | 'contractor' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      auditLogger.security('AUTH_ROLE_DENIED', {
        user_id: req.user.id,
        user_role: req.user.role,
        required_roles: allowedRoles,
        path: req.path,
        ip: req.ip
      });
      
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    logger.debug('Role authorization successful', {
      user_id: req.user.id,
      role: req.user.role,
      path: req.path
    });

    next();
  };
};

// Verification requirement middleware
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (!req.user.verified) {
    auditLogger.security('AUTH_VERIFICATION_REQUIRED', {
      user_id: req.user.id,
      path: req.path,
      ip: req.ip
    });
    
    res.status(403).json({
      success: false,
      message: 'Account verification required'
    });
    return;
  }

  next();
};

// Resource ownership middleware (for quotes and wallets)
export const requireResourceOwnership = (_resourceIdParam: string, _ownerField: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // const resourceId = req.params[resourceIdParam];
    
    // For admin users, allow access to all resources
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // TODO: Implement actual resource ownership check by querying database
    // This would need to be implemented in the specific route handlers
    // as it requires database access to verify ownership
    
    next();
  };
};

// API Key middleware for service-to-service communication
export const authenticateServiceKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const serviceKey = req.headers['x-service-key'] as string;
  const expectedKey = process.env.SERVICE_API_KEY;

  if (!expectedKey) {
    logger.warn('Service API key not configured');
    res.status(500).json({
      success: false,
      message: 'Service authentication not configured'
    });
    return;
  }

  if (!serviceKey || serviceKey !== expectedKey) {
    auditLogger.security('SERVICE_AUTH_FAILED', {
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      path: req.path,
      provided_key: serviceKey ? 'provided' : 'missing'
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid service authentication'
    });
    return;
  }

  logger.debug('Service authenticated successfully', {
    path: req.path,
    ip: req.ip
  });

  next();
};

export default {
  authenticateToken,
  requireRole,
  requireVerified,
  requireResourceOwnership,
  authenticateServiceKey
};