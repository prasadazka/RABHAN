import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import config from './config/environment.config';
import { database } from './config/database.config';
import { logger, auditLogger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { sanitizeInput } from './middleware/validation.middleware';
import { penaltySchedulerService } from './services/penalty-scheduler.service';

// Import routes
import quoteRoutes from './routes/quote.routes';
import financialRoutes from './routes/financial.routes';
import walletRoutes from './routes/wallet.routes';
import adminRoutes from './routes/admin.routes';
import penaltyRoutes from './routes/penalty.routes';

dotenv.config();

class QuoteServiceServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.corsOrigin.split(',').map((origin: string) => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Service-Key']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests, please try again later',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString()
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        auditLogger.security('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          user_id: (req as any).user?.id
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    this.app.use('/api/', limiter);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request sanitization
    this.app.use(sanitizeInput);

    // Request ID middleware for tracking
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string || 
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          request_id: req.headers['x-request-id'],
          user_id: (req as any).user?.id
        };

        if (res.statusCode >= 400) {
          logger.warn('HTTP request completed with error', logData);
        } else {
          logger.info('HTTP request completed', logData);
        }
      });

      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'Quote Service is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv
      });
    });

    // API status endpoint
    this.app.get('/api/status', async (_req, res) => {
      try {
        // Check database connection
        const dbResult = await database.query('SELECT NOW() as current_time');
        const dbStatus = dbResult.rows[0] ? 'connected' : 'disconnected';

        res.json({
          success: true,
          service: 'quote-service',
          version: '1.0.0',
          environment: config.nodeEnv,
          timestamp: new Date().toISOString(),
          status: {
            database: dbStatus,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            uptime: Math.round(process.uptime())
          }
        });
      } catch (error) {
        logger.error('Status check failed:', error);
        res.status(503).json({
          success: false,
          message: 'Service partially available',
          error: 'Database connection failed'
        });
      }
    });

    // API routes
    this.app.use('/api/quotes', quoteRoutes);
    this.app.use('/api/financial', financialRoutes);
    this.app.use('/api/wallets', walletRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/penalties', penaltyRoutes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'RABHAN Quote Management Service API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          health: '/health',
          status: '/api/status'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler for unknown routes
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
      });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.shutdown();
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      this.shutdown();
    });
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      await database.getPool();
      logger.info('✅ Database connection established');

      // Start the server
      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 Quote Service started successfully`, {
          port: config.port,
          environment: config.nodeEnv,
          pid: process.pid,
          memory_usage: process.memoryUsage(),
          node_version: process.version
        });

        // Initialize penalty scheduler
        try {
          penaltySchedulerService.initialize();
          logger.info('✅ Penalty scheduler initialized');
        } catch (error) {
          logger.error('❌ Failed to initialize penalty scheduler', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Audit log for service start
        auditLogger.security('SERVICE_STARTED', {
          service: 'quote-service',
          version: '1.0.0',
          port: config.port,
          environment: config.nodeEnv,
          pid: process.pid,
          penalty_scheduler: 'initialized'
        });
      });

      // Server error handling
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`❌ Port ${config.port} is already in use`);
        } else {
          logger.error('❌ Server error:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('❌ Failed to start Quote Service:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('🔄 Initiating graceful shutdown...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('✅ HTTP server closed');
      }

      // Stop penalty scheduler
      try {
        penaltySchedulerService.stop();
        logger.info('✅ Penalty scheduler stopped');
      } catch (error) {
        logger.error('❌ Error stopping penalty scheduler', { error });
      }

      // Close database connections
      await database.closePool();
      logger.info('✅ Database connections closed');

      // Audit log for service stop
      auditLogger.security('SERVICE_STOPPED', {
        service: 'quote-service',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime())
      });

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start the server
const quoteService = new QuoteServiceServer();

if (require.main === module) {
  quoteService.start();
}

export default quoteService;