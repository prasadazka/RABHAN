import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RateLimitError } from './errorHandler.middleware';
import { logger } from '../utils/logger';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export const rateLimiter = (options: RateLimiterOptions = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    message = 'Too many requests from this IP',
    skipSuccessfulRequests = false,
    keyGenerator
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req: Request) => {
      return req.ip || 'unknown';
    }),
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });
      
      throw new RateLimitError(message);
    }
  });
};

export const strictRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many requests, please try again later'
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 100,
  skipSuccessfulRequests: true
});

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts'
});

export const calculateRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 50,
  message: 'Too many calculation requests',
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip || 'unknown';
  }
});