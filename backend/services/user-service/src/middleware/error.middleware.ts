import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { 
  UserServiceError, 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  UnauthorizedError,
  ComplianceError 
} from '../types';
import { logger, logAudit } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.id || 'unknown';
  
  // Log error with context
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    correlationId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Handle specific error types
  if (error instanceof UserServiceError) {
    // Log compliance violations
    if (error instanceof ComplianceError) {
      logAudit('COMPLIANCE_VIOLATION', {
        error: error.message,
        details: error.details,
        correlationId
      }, req.user?.id);
    }

    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        service: 'user-service'
      }
    });
  }

  // Handle validation errors (Joi)
  if (error.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        service: 'user-service'
      }
    });
  }

  // Handle database errors
  if (error.name === 'DatabaseError' || error.message.includes('duplicate key')) {
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      error: 'Database operation failed',
      code: 'DATABASE_ERROR',
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        service: 'user-service'
      }
    });
  }

  // Handle timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    return res.status(StatusCodes.REQUEST_TIMEOUT).json({
      success: false,
      error: 'Request timeout',
      code: 'TIMEOUT_ERROR',
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        service: 'user-service'
      }
    });
  }

  // Handle rate limiting
  if (error.message.includes('rate limit')) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_ERROR',
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId,
        service: 'user-service'
      }
    });
  }

  // Default error response
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    code: 'INTERNAL_ERROR',
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId,
      service: 'user-service'
    }
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      service: 'user-service'
    }
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};