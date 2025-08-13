/**
 * RABHAN Marketplace Service - Authentication Middleware
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/environment.config';
import { logger, SAMALogCategory } from '@/utils/logger';
import { UnauthorizedError, ForbiddenError } from '@/types/marketplace.types';

// JWT Token payload interface
interface JWTPayload {
  userId: string;
  role: string;
  contractorId?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// User roles for authorization
export enum UserRole {
  USER = 'USER',
  CONTRACTOR = 'CONTRACTOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.CONTRACTOR]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4
};

/**
 * Extract and validate JWT token from request
 */
async function extractTokenFromRequest(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new UnauthorizedError('Authorization header missing');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid authorization format. Expected: Bearer <token>');
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    throw new UnauthorizedError('Token missing from authorization header');
  }

  return token;
}

/**
 * Verify JWT token and extract user information
 */
async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    // Validate token structure
    if (!decoded.userId || !decoded.role || !decoded.sessionId) {
      throw new UnauthorizedError('Invalid token structure');
    }

    // Check token expiration (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      throw new UnauthorizedError('Token expired');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw error;
  }
}

/**
 * Main authentication middleware
 * Validates JWT tokens and attaches user context to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = process.hrtime.bigint();
  
  try {
    // Extract token from request
    const token = await extractTokenFromRequest(req);
    
    // Verify and decode token
    const payload = await verifyToken(token);
    
    // Attach user information to request
    req.user = {
      id: payload.userId,
      role: payload.role,
      contractorId: payload.contractorId
    };

    // Update request context with user information
    req.context.userId = payload.userId;
    req.context.userRole = payload.role;
    req.context.contractorId = payload.contractorId;
    req.context.sessionId = payload.sessionId;

    // SAMA Audit: Successful authentication
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    logger.auditAuthentication(
      payload.userId,
      'TOKEN_VERIFICATION',
      'SUCCESS',
      {
        sessionId: payload.sessionId,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
        performanceMetrics: { duration }
      }
    );

    next();
  } catch (error) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    // SAMA Audit: Failed authentication
    logger.auditAuthentication(
      'unknown',
      'TOKEN_VERIFICATION',
      'FAILURE',
      {
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
        error: error instanceof Error ? error.message : String(error),
        performanceMetrics: { duration }
      }
    );

    // Security logging for potential attacks
    if (req.headers.authorization) {
      logger.auditSecurity(
        'INVALID_TOKEN_ATTEMPT',
        'BLOCKED',
        {
          ipAddress: req.context.ipAddress,
          userAgent: req.context.userAgent,
          riskLevel: 'MEDIUM'
        }
      );
    }

    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.context.requestId,
        version: '1.0.0'
      }
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user context if token is valid, but doesn't fail if missing
 */
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      
      req.user = {
        id: payload.userId,
        role: payload.role,
        contractorId: payload.contractorId
      };

      req.context.userId = payload.userId;
      req.context.userRole = payload.role;
      req.context.contractorId = payload.contractorId;
      req.context.sessionId = payload.sessionId;
    }
    
    next();
  } catch (error) {
    // For optional authentication, continue without user context
    logger.debug('Optional authentication failed, continuing without user context', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.context.requestId
    });
    next();
  }
};

/**
 * Role-based authorization middleware factory
 */
export const requireRole = (requiredRoles: UserRole | UserRole[]) => {
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role as UserRole;
      
      // Check if user has any of the required roles
      const hasRequiredRole = rolesArray.some(role => {
        // Exact role match
        if (userRole === role) return true;
        
        // Hierarchy check (higher roles can access lower role resources)
        if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]) return true;
        
        return false;
      });

      if (!hasRequiredRole) {
        // SAMA Audit: Authorization failure
        logger.auditSecurity(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'BLOCKED',
          {
            userId: req.user.id,
            requiredRoles: rolesArray,
            userRole,
            resourceType: req.route?.path || req.path,
            actionType: req.method as any,
            ipAddress: req.context.ipAddress,
            riskLevel: 'HIGH'
          }
        );

        throw new ForbiddenError(`Access denied. Required role(s): ${rolesArray.join(', ')}`);
      }

      // SAMA Audit: Successful authorization
      logger.auditSecurity(
        'AUTHORIZED_ACCESS',
        'SUCCESS',
        {
          userId: req.user.id,
          userRole,
          resourceType: req.route?.path || req.path,
          actionType: req.method as any,
          ipAddress: req.context.ipAddress,
          riskLevel: 'LOW'
        }
      );

      next();
    } catch (error) {
      res.status(error instanceof ForbiddenError ? 403 : 401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authorization failed',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      });
    }
  };
};

/**
 * Contractor-specific authorization middleware
 * Ensures contractor can only access their own resources
 */
export const requireContractorAccess = (resourceContractorIdParam = 'contractorId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role as UserRole;
      
      // Admins and super admins can access all contractor resources
      if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
        next();
        return;
      }

      // For contractors, ensure they can only access their own resources
      if (userRole === UserRole.CONTRACTOR) {
        const resourceContractorId = req.params[resourceContractorIdParam] || req.body.contractorId;
        
        if (!resourceContractorId) {
          throw new ForbiddenError('Contractor ID required for resource access');
        }

        if (req.user.contractorId !== resourceContractorId) {
          // SAMA Audit: Unauthorized contractor access attempt
          logger.auditSecurity(
            'UNAUTHORIZED_CONTRACTOR_ACCESS',
            'BLOCKED',
            {
              userId: req.user.id,
              userContractorId: req.user.contractorId,
              requestedContractorId: resourceContractorId,
              resourceType: req.route?.path || req.path,
              riskLevel: 'HIGH'
            }
          );

          throw new ForbiddenError('Access denied. Cannot access other contractor resources');
        }

        next();
        return;
      }

      // Regular users cannot access contractor-specific resources
      throw new ForbiddenError('Insufficient permissions for contractor resources');

    } catch (error) {
      res.status(error instanceof ForbiddenError ? 403 : 401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authorization failed',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.context.requestId,
          version: '1.0.0'
        }
      });
    }
  };
};

/**
 * Admin-only middleware for sensitive operations
 */
export const requireAdmin = requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

/**
 * Contractor-only middleware
 */
export const requireContractor = requireRole(UserRole.CONTRACTOR);

/**
 * Any authenticated user middleware
 */
export const requireAuth = requireRole([UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]);

export type { JWTPayload };