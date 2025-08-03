import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.server.maxFileSize,
    files: 1,
    fields: 10,
  },
});

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer upload error:', {
      error: error.message,
      code: error.code,
      field: error.field,
      requestId: req.headers['x-request-id'],
    });

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          success: false,
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize: config.server.maxFileSize,
        });
        break;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          success: false,
          error: 'Too many files',
          code: 'TOO_MANY_FILES',
          maxFiles: 1,
        });
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          code: 'UNEXPECTED_FILE',
        });
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'File upload error',
          code: 'UPLOAD_ERROR',
        });
    }
  } else if (error.message.includes('File type')) {
    logger.error('File type error:', {
      error: error.message,
      requestId: req.headers['x-request-id'],
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_FILE_TYPE',
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    });
  } else {
    next(error);
  }
};

// Request validation middleware
export const validateUploadRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Debug logging
  console.log('🔍 Validating upload request:');
  console.log('📋 Body:', req.body);
  console.log('📁 File:', req.file ? { 
    originalname: req.file.originalname, 
    mimetype: req.file.mimetype, 
    size: req.file.size 
  } : 'No file');
  
  const { categoryId } = req.body;

  if (!categoryId) {
    res.status(400).json({
      success: false,
      error: 'Missing required field: categoryId',
      code: 'MISSING_CATEGORY_ID',
    });
    return;
  }

  // Validate categoryId (UUID format or alphanumeric with underscores)
  const categoryUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const categoryRegex = /^[a-z0-9_]+$/;
  if (!categoryUuidRegex.test(categoryId) && !categoryRegex.test(categoryId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid categoryId format (must be UUID or alphanumeric)',
      code: 'INVALID_CATEGORY_ID',
    });
    return;
  }

  next();
};

// Rate limiting middleware
export const uploadRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // Simple in-memory rate limiting (in production, use Redis)
  const userUploadCount = uploadCounts.get(req.body.userId) || 0;
  const currentTime = Date.now();
  
  // Reset counter every hour
  if (currentTime - lastReset > 3600000) {
    uploadCounts.clear();
    lastReset = currentTime;
  }

  if (userUploadCount >= config.server.maxUploadsPerHour) {
    logger.warn('Upload rate limit exceeded', {
      userId: req.body.userId,
      count: userUploadCount,
      limit: config.server.maxUploadsPerHour,
      requestId: req.headers['x-request-id'],
    });

    return res.status(429).json({
      success: false,
      error: 'Upload rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      limit: config.server.maxUploadsPerHour,
      resetTime: new Date(lastReset + 3600000).toISOString(),
    });
  }

  uploadCounts.set(req.body.userId, userUploadCount + 1);
  next();
};

// In-memory storage for rate limiting (use Redis in production)
const uploadCounts = new Map<string, number>();
let lastReset = Date.now();

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    requestId: req.headers['x-request-id'],
    userId: req.body?.userId,
    ip: req.ip,
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      requestId: req.headers['x-request-id'],
      userId: req.body?.userId,
      success: body?.success,
    });

    return originalJson.call(this, body);
  };

  next();
};

// CORS middleware
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = config.server.allowedOrigins.split(',').map(origin => origin.trim());
  const origin = req.get('origin');
  
  // In development, be more permissive with CORS
  if (config.isDevelopment) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

// Authentication middleware - JWT token verification
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    // Use the same JWT secret as other services
    const jwtSecret = process.env.JWT_SECRET || 'rabhan_jwt_secret_key_for_development_only_change_in_production';
    
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Extract user information from the token
    const userId = decoded.userId || decoded.id || decoded.sub;
    
    if (!userId) {
      logger.error('JWT token missing userId', {
        decoded,
        requestId: req.headers['x-request-id'],
      });
      
      res.status(401).json({
        success: false,
        error: 'Invalid token: missing user ID',
        code: 'INVALID_TOKEN',
      });
      return;
    }
    
    // Add user information to request for downstream middleware
    (req as any).user = {
      userId,
      ...decoded
    };
    
    logger.debug('Authentication successful', {
      userId,
      requestId: req.headers['x-request-id'],
    });
    
    next();
  } catch (error) {
    logger.error('JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id'],
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
    return;
  }
};

// Error handling middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
    userId: req.body?.userId,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.headers['x-request-id'],
  });
};