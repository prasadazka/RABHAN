import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import 'express-async-errors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { db } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';

// Create Express app
const app = express();

// Trust proxy for correct IP detection
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Request-Time'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Additional CORS handling for preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Request-Time');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Compression for responses
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID for tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.id
    });
  });
  
  next();
});

// Health check routes (before authentication)
app.use('/', healthRoutes);

// API routes
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connections
    await db.disconnect();
    
    // Close server
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, HOST, async () => {
  try {
    // Connect to database
    await db.connect();
    
    logger.info(`🚀 User Service started successfully`, {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0'
    });
    
    // Log service configuration
    logger.info('Service configuration', {
      database: {
        host: process.env.DATABASE_HOST,
        name: process.env.DATABASE_NAME,
        poolMax: process.env.DATABASE_POOL_MAX
      },
      redis: {
        host: process.env.REDIS_HOST,
        db: process.env.REDIS_DB
      },
      auth: {
        serviceUrl: process.env.AUTH_SERVICE_URL
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
});

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export default app;