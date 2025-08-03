import { Request, Response, NextFunction } from 'express';
import { transformFrontendData } from '../utils/validation.utils';
import { logger } from '../utils/logger';

/**
 * Middleware to transform frontend camelCase data to backend snake_case format
 * This runs before validation to ensure the data matches expected schema
 */
export const transformFrontendToBackend = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    logger.info('Transform middleware - Before:', req.body);
    req.body = transformFrontendData(req.body);
    logger.info('Transform middleware - After:', req.body);
  }
  next();
};