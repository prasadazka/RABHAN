import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UnauthorizedError } from '../types';
import { logger } from '../utils/logger';

// Ensure environment variables are loaded
dotenv.config();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        nationalId?: string;
      };
      id: string;
    }
  }
}

// Use shared JWT secret (same as auth service)
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';
console.log('🔐 JWT Secret loaded:', jwtSecret ? 'Found' : 'Missing', jwtSecret?.substring(0, 10) + '...');

// Verify JWT token
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔐 Auth middleware - checking token...');
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header provided');
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token received, verifying...', { tokenStart: token.substring(0, 20) + '...' });
    console.log('🔐 Using JWT secret:', jwtSecret.substring(0, 10) + '...');

    // First, let's decode without verification to see the structure
    try {
      const decoded_raw = jwt.decode(token, { complete: true });
      console.log('🔍 Raw token structure:', JSON.stringify(decoded_raw, null, 2));
    } catch (e) {
      console.log('❌ Failed to decode token:', e);
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'rabhan-auth-service',
      audience: 'rabhan-platform'
    }) as any;

    console.log('✅ Token verified successfully:', { userId: decoded.userId, email: decoded.email, role: decoded.role });

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      nationalId: decoded.nationalId
    };

    console.log('👤 User set on request:', req.user);
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

// Check if user has required role
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Optional authentication (for public endpoints that may benefit from auth)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    // Try to verify token
    try {
      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'rabhan-auth-service',
        audience: 'rabhan-platform'
      }) as any;

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        nationalId: decoded.nationalId
      };
    } catch (error) {
      // Invalid token, continue without authentication
      logger.debug('Optional auth: Invalid token provided', { error });
    }

    next();
  } catch (error) {
    next(error);
  }
};