import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Create rate limiter configurations
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: options.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
};

// General API rate limiting
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later'
});

// Strict rate limiting for create operations
export const createRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 creates per minute
  message: 'Too many create requests, please try again later'
});

// Profile update rate limiting
export const updateRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 updates per minute
  message: 'Too many update requests, please try again later'
});

// BNPL eligibility check rate limiting
export const bnplRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 checks per minute
  message: 'Too many BNPL eligibility checks, please try again later'
});

// Admin operations rate limiting
export const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 admin operations per minute
  message: 'Too many admin requests, please try again later'
});

// Document operations rate limiting
export const documentRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 document operations per minute
  message: 'Too many document requests, please try again later'
});