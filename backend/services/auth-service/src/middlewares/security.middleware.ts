import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.config';
import { SAMALogger } from '../utils/logger';

// Rate limiting configuration
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      SAMALogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', 'MEDIUM', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      res.status(429).json({ error: message });
    }
  });
};

// General rate limiter
export const generalRateLimit = createRateLimiter(
  config.security.rateLimitWindowMs,
  config.env === 'development' ? config.security.rateLimitMaxRequests * 10 : config.security.rateLimitMaxRequests,
  'Too many requests from this IP'
);

// Strict rate limiter for auth endpoints (relaxed for development)
export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  config.env === 'development' ? 1000 : 100, // 1000 requests in development, 100 in production
  'Too many authentication attempts'
);

// Password reset rate limiter
export const passwordResetRateLimit = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 requests per hour
  'Too many password reset requests'
);

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // SAMA CSF security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Request logging middleware for SAMA compliance
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    SAMALogger.logAuthEvent('API_REQUEST', undefined, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    });
  });
  
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP || '')) {
      SAMALogger.logSecurityEvent('UNAUTHORIZED_IP_ACCESS', 'HIGH', {
        ip: clientIP,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    next();
  };
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS attempts
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  if (req.query) {
    sanitizeObject(req.query);
  }
  
  next();
};

// SAMA compliance middleware
export const samaCompliance = (req: Request, res: Response, next: NextFunction) => {
  // Log all requests for SAMA audit trail
  const auditData = {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  SAMALogger.logAuthEvent('SAMA_AUDIT_LOG', undefined, auditData);
  
  next();
};

// CORS configuration for SAMA compliance
export const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'https://rabhan.sa',
      'https://www.rabhan.sa',
      'https://admin.rabhan.sa',
      'https://contractor.rabhan.sa'
    ];
    
    // Add development origins
    if (config.env === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:4173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      );
    }
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      SAMALogger.logSecurityEvent('CORS_VIOLATION', 'MEDIUM', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        SAMALogger.logSecurityEvent('REQUEST_TIMEOUT', 'LOW', {
          path: req.path,
          method: req.method,
          timeout: timeoutMs
        });
        
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};