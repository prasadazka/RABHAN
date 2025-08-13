import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Error response type
interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: ValidationDetail[];
}

interface ValidationDetail {
  field: string;
  message: string;
  value?: any;
}

// Generic validation middleware factory
export const validateRequest = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Collect all validation errors
      stripUnknown: true, // Remove unknown properties
      convert: true // Convert types where possible
    });

    if (error) {
      const validationErrors: ValidationDetail[] = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        user_id: (req as any).user?.id
      });

      const response: ValidationErrorResponse = {
        success: false,
        message: 'Validation error',
        errors: validationErrors
      };

      res.status(400).json(response);
      return;
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Validate UUID parameters
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      logger.warn('Invalid UUID parameter', {
        paramName,
        value: uuid,
        path: req.path,
        user_id: (req as any).user?.id
      });

      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        errors: [{
          field: paramName,
          message: 'Must be a valid UUID',
          value: uuid
        }]
      });
      return;
    }

    next();
  };
};

// Validate business rule constraints
export const validateBusinessConstraints = {
  // Validate price per kWp doesn't exceed maximum
  pricePerKwp: (req: Request, _res: Response, next: NextFunction): void => {
    const { price_per_kwp } = req.body;
    const maxPrice = parseFloat(process.env.MAX_PRICE_PER_KWP || '2000');

    if (price_per_kwp && price_per_kwp > maxPrice) {
      logger.warn('Price per kWp exceeds maximum', {
        provided: price_per_kwp,
        maximum: maxPrice,
        user_id: (req as any).user?.id
      });

      _res.status(400).json({
        success: false,
        message: 'Price validation failed',
        errors: [{
          field: 'price_per_kwp',
          message: `Price per kWp cannot exceed ${maxPrice} SAR`,
          value: price_per_kwp
        }]
      });
      return;
    }

    next();
  },

  // Validate installment months are allowed
  installmentMonths: (req: Request, _res: Response, next: NextFunction): void => {
    const { installment_months } = req.body;
    const allowedMonths = [6, 12, 18, 24];

    if (installment_months && !allowedMonths.includes(installment_months)) {
      logger.warn('Invalid installment months', {
        provided: installment_months,
        allowed: allowedMonths,
        user_id: (req as any).user?.id
      });

      _res.status(400).json({
        success: false,
        message: 'Installment validation failed',
        errors: [{
          field: 'installment_months',
          message: `Installment months must be one of: ${allowedMonths.join(', ')}`,
          value: installment_months
        }]
      });
      return;
    }

    next();
  },

  // Validate system size is reasonable
  systemSize: (req: Request, _res: Response, next: NextFunction): void => {
    const { system_size_kwp } = req.body;
    const minSize = 1;
    const maxSize = 1000; // Reasonable maximum for most installations

    if (system_size_kwp && (system_size_kwp < minSize || system_size_kwp > maxSize)) {
      logger.warn('Invalid system size', {
        provided: system_size_kwp,
        min: minSize,
        max: maxSize,
        user_id: (req as any).user?.id
      });

      _res.status(400).json({
        success: false,
        message: 'System size validation failed',
        errors: [{
          field: 'system_size_kwp',
          message: `System size must be between ${minSize} and ${maxSize} kWp`,
          value: system_size_kwp
        }]
      });
      return;
    }

    next();
  }
};

// Sanitize input data
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Remove potential XSS characters from string fields
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (_req: Request, _res: Response, next: NextFunction): void => {
  // Rate limiting logic would typically be handled by express-rate-limit
  // This is a placeholder for custom rate limiting validation if needed
  next();
};

export default {
  validateRequest,
  validateUUID,
  validateBusinessConstraints,
  sanitizeInput,
  validateRateLimit
};