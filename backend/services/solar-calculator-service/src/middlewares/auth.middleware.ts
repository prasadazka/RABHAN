import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from './errorHandler.middleware';
import { logger } from '../utils/logger';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      throw new Error('Authentication configuration error');
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          throw new AuthenticationError('Token has expired');
        } else if (err.name === 'JsonWebTokenError') {
          throw new AuthenticationError('Invalid token');
        } else {
          throw new AuthenticationError('Token verification failed');
        }
      }

      req.user = decoded as JWTPayload;
      next();
    });
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('User not authenticated'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AuthorizationError(`Role '${req.user.role}' is not authorized for this resource`));
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      next();
      return;
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded as JWTPayload;
      }
      next();
    });
  } catch (error) {
    next();
  }
};