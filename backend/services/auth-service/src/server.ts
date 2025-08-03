import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config, validateConfig } from './config/environment.config';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { logger, SAMALogger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import {
  generalRateLimit,
  securityHeaders,
  requestLogger,
  sanitizeInput,
  samaCompliance,
  corsOptions,
  requestTimeout
} from './middlewares/security.middleware';

class AuthServer {
  private app: express.Application;
  private database: DatabaseConfig;
  private redis: RedisConfig;

  constructor() {
    this.app = express();
    this.database = DatabaseConfig.getInstance();
    this.redis = RedisConfig.getInstance();
    
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // Custom security headers
    this.app.use(securityHeaders);

    // CORS
    this.app.use(cors(corsOptions));

    // Request timeout
    this.app.use(requestTimeout(30000));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(generalRateLimit);

    // Input sanitization
    this.app.use(sanitizeInput);

    // SAMA compliance logging
    this.app.use(samaCompliance);

    // Request logging
    this.app.use(requestLogger);

    // Trust proxy (for accurate IP addresses)
    this.app.set('trust proxy', 1);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      SAMALogger.logSecurityEvent('ENDPOINT_NOT_FOUND', 'LOW', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      
      SAMALogger.logSecurityEvent('UNHANDLED_ERROR', 'HIGH', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      // Don't leak error details in production
      if (config.isProduction) {
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      SAMALogger.logSecurityEvent('UNCAUGHT_EXCEPTION', 'CRITICAL', {
        error: err.message,
        stack: err.stack
      });
      
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      SAMALogger.logSecurityEvent('UNHANDLED_REJECTION', 'CRITICAL', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
      });
      
      process.exit(1);
    });
  }

  private async initializeConnections(): Promise<void> {
    try {
      // Test database connection
      const dbHealth = await this.database.testConnection();
      if (!dbHealth) {
        throw new Error('Database connection failed');
      }
      logger.info('Database connection established');

      // Connect to Redis
      await this.redis.connect();
      const redisHealth = await this.redis.healthCheck();
      if (!redisHealth) {
        throw new Error('Redis connection failed');
      }
      logger.info('Redis connection established');


    } catch (error) {
      logger.error('Failed to initialize connections:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated');

      // Initialize connections
      await this.initializeConnections();

      // Start server
      const server = this.app.listen(config.server.port, () => {
        logger.info(`Auth service running on port ${config.server.port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info(`SAMA compliance mode: ${config.sama.complianceMode}`);
        
        SAMALogger.logAuthEvent('SERVICE_STARTED', undefined, {
          port: config.server.port,
          environment: config.env,
          complianceMode: config.sama.complianceMode
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown(server));
      process.on('SIGINT', () => this.shutdown(server));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(server: any): Promise<void> {
    logger.info('Shutting down server...');
    
    SAMALogger.logAuthEvent('SERVICE_SHUTDOWN', undefined, {
      timestamp: new Date().toISOString()
    });

    server.close(async () => {
      try {
        await this.database.closePool();
        await this.redis.disconnect();
        logger.info('Connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }
}

// Start the server
const server = new AuthServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});