/**
 * RABHAN Marketplace Service - Validation Middleware
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '@/utils/logger';
import { ValidationError } from '@/types/marketplace.types';

/**
 * Create validation middleware for request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'input' in err ? err.input : undefined
        }));

        logger.warn('Request body validation failed', {
          requestId: req.context?.requestId,
          validationErrors,
          userId: req.user?.id
        });

        const validationError = new ValidationError('Validation failed', {
          errors: validationErrors
        }, req.context?.requestId);

        next(validationError);
        return;
      }
      next(error);
    }
  };
};

/**
 * Create validation middleware for query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'input' in err ? err.input : undefined
        }));

        logger.warn('Query parameters validation failed', {
          requestId: req.context?.requestId,
          validationErrors,
          userId: req.user?.id
        });

        const validationError = new ValidationError('Query validation failed', {
          errors: validationErrors
        }, req.context?.requestId);

        next(validationError);
        return;
      }
      next(error);
    }
  };
};

/**
 * Create validation middleware for route parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'input' in err ? err.input : undefined
        }));

        logger.warn('Route parameters validation failed', {
          requestId: req.context?.requestId,
          validationErrors,
          userId: req.user?.id
        });

        const validationError = new ValidationError('Parameters validation failed', {
          errors: validationErrors
        }, req.context?.requestId);

        next(validationError);
        return;
      }
      next(error);
    }
  };
};

/**
 * UUID parameter validation schema
 */
export const UUIDParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

/**
 * Pagination query validation schema
 */
export const PaginationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC')
});

/**
 * Common validation middleware combinations
 */
export const validateUUIDParam = validateParams(UUIDParamSchema);
export const validatePaginationQuery = validateQuery(PaginationQuerySchema);