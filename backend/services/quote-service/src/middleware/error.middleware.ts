import { Request, Response, NextFunction } from 'express';
import { logger, auditLogger } from '../utils/logger';
import config from '../config/environment.config';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';
  
  constructor(message: string = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends Error {
  statusCode = 400;
  code = 'BUSINESS_RULE_VIOLATION';
  
  constructor(message: string, public rule: string, public details?: any) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class ExternalServiceError extends Error {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  
  constructor(service: string, message: string) {
    super(`${service}: ${message}`);
    this.name = 'ExternalServiceError';
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

// Main error handling middleware
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Invalid reference to related resource';
  } else if (err.code === '23514') { // PostgreSQL check constraint violation
    statusCode = 400;
    code = 'CONSTRAINT_VIOLATION';
    message = 'Data violates business constraints';
  }

  // Log the error
  const errorLogData = {
    requestId,
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    user_id: (req as any).user?.id,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    stack: err.stack,
    details: err.details
  };

  if (statusCode >= 500) {
    logger.error('Internal server error', errorLogData);
    
    // Audit log for critical errors
    auditLogger.security('INTERNAL_SERVER_ERROR', {
      requestId,
      path: req.path,
      method: req.method,
      user_id: (req as any).user?.id,
      error_code: code,
      error_message: message
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error', errorLogData);
    
    // Audit log for authentication/authorization errors
    if (statusCode === 401 || statusCode === 403) {
      auditLogger.security('ACCESS_DENIED', {
        requestId,
        path: req.path,
        method: req.method,
        user_id: (req as any).user?.id,
        error_code: code,
        ip: req.ip
      });
    }
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message: config.isProduction && statusCode >= 500 
        ? 'Internal server error' 
        : message,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId
    }
  };

  // Include details in development mode or for client errors
  if (!config.isProduction || statusCode < 500) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler for unknown routes
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Database error handler
export const handleDatabaseError = (error: any): CustomError => {
  logger.error('Database error:', error);

  if (error.code === '23505') {
    return new ConflictError('Resource already exists', {
      constraint: error.constraint,
      detail: error.detail
    });
  }

  if (error.code === '23503') {
    return new ValidationError('Invalid reference to related resource', {
      constraint: error.constraint,
      detail: error.detail
    });
  }

  if (error.code === '23514') {
    return new ValidationError('Data violates business constraints', {
      constraint: error.constraint,
      detail: error.detail
    });
  }

  if (error.code === '42P01') {
    return new Error('Database table not found - check migrations');
  }

  // Generic database error
  return new Error('Database operation failed');
};

// Business rule validation
export const validateBusinessRule = (
  condition: boolean,
  rule: string,
  message: string,
  details?: any
): void => {
  if (!condition) {
    throw new BusinessRuleError(message, rule, details);
  }
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  validateBusinessRule,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
  ExternalServiceError
};