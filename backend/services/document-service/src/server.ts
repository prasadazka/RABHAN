import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.config';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { MinioConfig } from './config/minio.config';
import documentRoutes from './routes/document.routes';
import kycRoutes from './routes/kyc.routes';
import { logger } from './utils/logger';

class DocumentService {
  private app: express.Application;
  private database: DatabaseConfig;
  private redis: RedisConfig;
  private minio: MinioConfig;

  constructor() {
    this.app = express();
    this.database = DatabaseConfig.getInstance();
    this.redis = RedisConfig.getInstance();
    
    // Initialize MinIO for document storage
    this.minio = MinioConfig.getInstance();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
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
      crossOriginEmbedderPolicy: false,
    }));

    // Rate limiting (disabled for testing)
    // const limiter = rateLimit({
    //   windowMs: 15 * 60 * 1000, // 15 minutes
    //   max: config.server.maxRequestsPerWindow,
    //   message: {
    //     success: false,
    //     error: 'Too many requests',
    //     code: 'RATE_LIMIT_EXCEEDED',
    //   },
    //   standardHeaders: true,
    //   legacyHeaders: false,
    // });
    // this.app.use(limiter);

    // CORS
    this.app.use(cors({
      origin: config.server.allowedOrigins.split(','),
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] || 
                       `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      req.headers['x-request-id'] = requestId as string;
      res.setHeader('X-Request-ID', requestId);

      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - startTime;
        
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          requestId,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });

        return originalSend.call(this, body);
      };

      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        service: config.server.serviceName,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
      });
    });

    // API routes
    this.app.use('/api/documents', documentRoutes);
    this.app.use('/api/kyc', kycRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled application error:', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id'],
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: req.headers['x-request-id'],
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', {
        error: error.message,
        stack: error.stack,
      });
      
      // Give the logger time to write before exiting
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', {
        reason,
        promise,
      });
      
      // Give the logger time to write before exiting
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Starting graceful shutdown');

      // Close database connections
      if (this.database && typeof this.database.close === 'function') {
        await this.database.close();
      }

      // Close Redis connections
      if (process.env.REDIS_ENABLED !== 'false') {
        try {
          if (this.redis && typeof this.redis.close === 'function') {
            await this.redis.close();
          }
        } catch (error) {
          logger.warn('Redis close failed (may not be connected)');
        }
      }

      // Close MinIO connections (if needed)
      // await this.minio.close();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Document Service');

      // Initialize database
      await this.database.connect();
      logger.info('Database connected successfully');

      // Initialize Redis (skip in development)
      if (process.env.REDIS_ENABLED !== 'false') {
        try {
          await this.redis.connect();
          logger.info('Redis connected successfully');
        } catch (error) {
          logger.warn('Redis connection failed, continuing without Redis');
        }
      } else {
        logger.info('Redis skipped (disabled in development)');
      }

      // Initialize MinIO for document storage (skip if disabled)
      if (process.env.MINIO_ENABLED !== 'false') {
        try {
          await this.minio.connect();
          logger.info('MinIO connected successfully');
        } catch (error) {
          logger.warn('MinIO connection failed, continuing with local storage');
        }
      } else {
        logger.info('MinIO skipped (using local storage)');
      }

      // Run database migrations
      if (this.database && typeof this.database.runMigrations === 'function') {
        await this.database.runMigrations();
        logger.info('Database migrations completed');
      } else {
        logger.info('Database migrations method not available');
      }

      logger.info('Document Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Document Service:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      const server = this.app.listen(config.server.port, () => {
        logger.info(`Document Service started successfully`, {
          serviceName: config.server.serviceName,
          port: config.server.port,
          environment: config.env,
          processId: process.pid,
          nodeVersion: process.version,
        });
      });

      // Handle server shutdown
      server.on('close', () => {
        logger.info('HTTP server closed');
      });

      return new Promise((resolve, reject) => {
        server.on('listening', resolve);
        server.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to start Document Service:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }
}

// Start the service
const documentService = new DocumentService();

if (require.main === module) {
  documentService.start().catch((error) => {
    logger.error('Failed to start Document Service:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export default documentService;