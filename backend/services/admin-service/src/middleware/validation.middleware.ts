/**
 * RABHAN Validation Middleware
 * Saudi Arabia's Solar BNPL Platform - Request Validation
 * 
 * Features:
 * - Express validator integration
 * - SAMA compliance validation
 * - Performance optimized validation
 * - Arabic content support
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Validate request using express-validator rules
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    logger.warn('Request validation failed', {
      path: req.path,
      method: req.method,
      errors: errorDetails,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      error_code: 'VALIDATION_ERROR',
      details: errorDetails
    });
    return;
  }

  next();
};

/**
 * Sanitize Arabic text input
 */
export const sanitizeArabicText = (text: string): string => {
  if (!text) return text;
  
  // Remove non-Arabic characters except spaces and common punctuation
  return text.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\-_,.!?]/g, '').trim();
};

/**
 * Validate Saudi National ID format
 */
export const validateSaudiNationalId = (id: string): boolean => {
  if (!id || id.length !== 10) return false;
  
  // Basic checksum validation for Saudi National ID
  const digits = id.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  
  const checkDigit = (11 - (sum % 11)) % 11;
  return checkDigit === digits[9];
};

/**
 * Validate Saudi phone number format
 */
export const validateSaudiPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Saudi phone number patterns
  const patterns = [
    /^966[5][0-9]{8}$/, // +966 5XXXXXXXX (mobile)
    /^966[1][1-9][0-9]{7}$/, // +966 1XXXXXXXX (Riyadh)
    /^966[2][0-9]{7}$/, // +966 2XXXXXXX (Mecca/Jeddah)
    /^966[3][0-9]{7}$/, // +966 3XXXXXXX (Eastern Province)
    /^966[4][0-9]{7}$/, // +966 4XXXXXXX (Southern regions)
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
};

/**
 * SAMA compliance validation
 */
export const validateSAMACompliance = (req: Request, res: Response, next: NextFunction): void => {
  const requiredHeaders = ['user-agent', 'accept'];
  const missingHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingHeaders.length > 0) {
    logger.security('SAMA compliance violation - missing headers', {
      path: req.path,
      method: req.method,
      missingHeaders,
      ip: req.ip
    });
    
    res.status(400).json({
      success: false,
      error: 'SAMA compliance violation',
      error_code: 'COMPLIANCE_ERROR',
      details: `Missing required headers: ${missingHeaders.join(', ')}`
    });
    return;
  }
  
  next();
};

/**
 * Rate limiting validation
 */
export const checkRateLimit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) {
        requests.delete(key);
      }
    }
    
    const current = requests.get(identifier);
    
    if (!current) {
      requests.set(identifier, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (current.count >= maxRequests) {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        count: current.count,
        limit: maxRequests
      });
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        error_code: 'RATE_LIMIT_EXCEEDED',
        retry_after: Math.ceil((current.resetTime - now) / 1000)
      });
      return;
    }
    
    current.count++;
    next();
  };
};