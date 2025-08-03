import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt.utils';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../types/auth.types';
import { SAMALogger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    sessionId: string;
  };
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        SAMALogger.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', 'LOW', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(401).json({ error: 'Access token required' });
        return;
      }
      
      const token = authHeader.substring(7);
      
      // Verify token
      const payload = JWTUtils.verifyAccessToken(token);
      
      // Get user details based on role from token
      const user = await this.authService.getUserByIdAndRole(payload.userId, payload.role);
      
      if (!user) {
        SAMALogger.logSecurityEvent('INVALID_USER_TOKEN', 'MEDIUM', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          role: payload.role
        });
        
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      
      // Check if user is active
      if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
        SAMALogger.logSecurityEvent('INACTIVE_USER_ACCESS', 'MEDIUM', {
          userId: user.id,
          status: user.status
        });
        
        res.status(403).json({ error: 'Account is not active' });
        return;
      }
      
      // Add user to request - use role from JWT payload, not hardcoded
      req.user = {
        id: user.id,
        email: user.email,
        role: payload.role,
        sessionId: payload.sessionId
      };
      
      next();
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(401).json({ error: 'Token expired' });
        } else if (error.message.includes('invalid')) {
          res.status(401).json({ error: 'Invalid token' });
        } else {
          SAMALogger.logSecurityEvent('AUTH_MIDDLEWARE_ERROR', 'HIGH', { error: error.message });
          res.status(500).json({ error: 'Authentication error' });
        }
      } else {
        res.status(500).json({ error: 'Authentication error' });
      }
    }
  };

  authorize = (roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      if (!roles.includes(req.user.role)) {
        SAMALogger.logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', 'MEDIUM', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path
        });
        
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      
      next();
    };
  };

  optional = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }
      
      const token = authHeader.substring(7);
      
      try {
        const payload = JWTUtils.verifyAccessToken(token);
        const user = await this.authService.getUserByIdAndRole(payload.userId, payload.role);
        
        if (user && (user.status === 'ACTIVE' || user.status === 'PENDING')) {
          req.user = {
            id: user.id,
            email: user.email,
            role: payload.role,
            sessionId: payload.sessionId
          };
        }
      } catch (error) {
        // Ignore token errors for optional authentication
      }
      
      next();
      
    } catch (error) {
      // Ignore errors for optional authentication
      next();
    }
  };
}