/**
 * RABHAN Marketplace Service - Error Handling Middleware
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Request, Response, NextFunction } from 'express';
import { logger, SAMALogCategory } from '@/utils/logger';
import { env } from '@/config/environment.config';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  ServiceError,
  ApiResponse
} from '@/types/marketplace.types';

/**
 * Async error handler wrapper
 * Catches async errors and passes them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found middleware for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    {
      method: req.method,
      url: req.originalUrl,
      availableRoutes: [
        'GET /health',
        'GET /api/v1',
        'GET /api/v1/categories',
        'GET /api/v1/products/search'
      ]
    },
    req.context?.requestId
  );

  next(error);
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (
  error: Error | ServiceError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.context?.requestId || 'unknown';
  const userId = req.user?.id || 'anonymous';
  const startTime = req.context?.startTime || Date.now();
  const duration = Date.now() - startTime;

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof UnauthorizedError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ForbiddenError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ConflictError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof InternalServerError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  }

  // Prepare error metadata for logging
  const errorMetadata = {
    requestId,
    userId,
    ipAddress: req.context?.ipAddress,
    userAgent: req.context?.userAgent,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    performanceMetrics: { duration },
    riskLevel: determineRiskLevel(statusCode, error) as any
  };

  // Log error appropriately
  if (statusCode >= 500) {
    // Server errors - critical logging
    logger.error(`Server error: ${message}`, error, {
      ...errorMetadata,
      category: SAMALogCategory.SECURITY_EVENT
    });
    
    logger.auditSecurity('SERVER_ERROR', 'FAILURE', errorMetadata);
  } else if (statusCode === 401) {
    // Authentication errors
    logger.auditSecurity('AUTHENTICATION_FAILURE', 'BLOCKED', {
      ...errorMetadata,
      category: SAMALogCategory.AUTHENTICATION
    });
  } else if (statusCode === 403) {
    // Authorization errors
    logger.auditSecurity('AUTHORIZATION_FAILURE', 'BLOCKED', {
      ...errorMetadata,
      category: SAMALogCategory.AUTHORIZATION
    });
  } else if (statusCode === 400 || statusCode === 422) {
    // Client validation errors
    logger.warn(`Validation error: ${message}`, {
      ...errorMetadata,
      validationDetails: details
    });
  } else if (statusCode === 404) {
    // Not found errors (less critical)
    logger.info(`Resource not found: ${message}`, errorMetadata);
  } else {
    // Other client errors
    logger.warn(`Client error: ${message}`, errorMetadata);
  }

  // Prepare response body
  const errorResponse: ApiResponse = {
    success: false,
    message: env.NODE_ENV === 'production' && statusCode >= 500 
      ? 'Internal server error occurred' 
      : message,
    errors: details?.errors ? details.errors.map((err: any) => err.message) : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  };

  // Include debug information in development
  if (env.NODE_ENV === 'development') {
    (errorResponse as any).debug = {
      code: errorCode,
      details,
      stack: error.stack,
      performanceMetrics: { duration }
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Determine risk level based on status code and error type
 */
function determineRiskLevel(statusCode: number, error: Error): string {
  if (statusCode >= 500) {
    return 'HIGH';
  }
  
  if (statusCode === 401 || statusCode === 403) {
    return 'MEDIUM';
  }
  
  if (error.message.toLowerCase().includes('rate limit')) {
    return 'MEDIUM';
  }
  
  return 'LOW';
}

/**
 * Database error handler
 * Specifically handles PostgreSQL errors
 */
export const databaseErrorHandler = (error: any): ServiceError => {
  const requestId = 'db-error-' + Date.now();

  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // Unique constraint violation
      return new ConflictError(
        'Resource already exists',
        {
          constraint: error.constraint,
          detail: error.detail
        },
        requestId
      );
    
    case '23503': // Foreign key violation
      return new ValidationError(
        'Referenced resource does not exist',
        {
          constraint: error.constraint,
          detail: error.detail
        },
        requestId
      );
    
    case '23502': // Not null constraint violation
      return new ValidationError(
        'Required field is missing',
        {
          column: error.column,
          detail: error.detail
        },
        requestId
      );
    
    case '23514': // Check constraint violation
      return new ValidationError(
        'Invalid field value',
        {
          constraint: error.constraint,
          detail: error.detail
        },
        requestId
      );
    
    case '08006': // Connection failure
    case '08001': // Cannot establish connection
      return new InternalServerError(
        'Database connection error',
        {
          code: error.code,
          detail: 'Unable to connect to database'
        },
        requestId
      );
    
    case '57014': // Query canceled (timeout)
      return new InternalServerError(
        'Database query timeout',
        {
          code: error.code,
          detail: 'Query execution exceeded timeout limit'
        },
        requestId
      );
    
    default:
      // Generic database error
      return new InternalServerError(
        'Database operation failed',
        {
          code: error.code || 'UNKNOWN_DB_ERROR',
          detail: env.NODE_ENV === 'development' ? error.message : 'Database error occurred'
        },
        requestId
      );
  }
};

/**
 * Performance monitoring middleware
 * Monitors request performance and logs slow operations
 */
export const performanceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime.bigint();
  
  // Track memory usage at request start
  const memoryStart = process.memoryUsage();
  
  // Override res.end to capture performance metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds
    const memoryEnd = process.memoryUsage();
    const memoryDiff = memoryEnd.heapUsed - memoryStart.heapUsed;
    
    // Log performance metrics
    const performanceData = {
      requestId: req.context?.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      performanceMetrics: {
        duration,
        memoryUsage: memoryDiff,
        heapUsed: memoryEnd.heapUsed
      },
      userId: req.user?.id
    };
    
    // Log slow operations (>2ms target, warn >1000ms)
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        ...performanceData,
        category: SAMALogCategory.SYSTEM_PERFORMANCE,
        riskLevel: 'MEDIUM'
      });
    } else if (duration > 2) {
      logger.info('Operation completed', {
        ...performanceData,
        category: SAMALogCategory.SYSTEM_PERFORMANCE
      });
    }
    
    // SAMA performance audit for critical operations
    const criticalOperations = ['POST', 'PUT', 'DELETE'];
    if (criticalOperations.includes(req.method)) {
      logger.auditPerformance(
        `${req.method} ${req.originalUrl}`,
        duration,
        performanceData
      );
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};