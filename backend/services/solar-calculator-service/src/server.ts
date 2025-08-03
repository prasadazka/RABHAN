import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { SolarCalculatorRoutes } from './routes/solarCalculator.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';
import { securityHeaders, requestIdMiddleware, sanitizeInput, auditMiddleware } from './middlewares/security.middleware';
import { logger } from './utils/logger';

dotenv.config();

export class SolarCalculatorServer {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env['PORT'] || '3005', 10);
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(securityHeaders);
    this.app.use(requestIdMiddleware);
    this.app.use(compression());
    this.app.use(cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') || [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(sanitizeInput);
    this.app.use(auditMiddleware);
  }

  private initializeRoutes(): void {
    const solarRoutes = new SolarCalculatorRoutes();
    
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'solar-calculator-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/ready', (_req, res) => {
      res.status(200).json({
        ready: true,
        service: 'solar-calculator-service',
        timestamp: new Date().toISOString()
      });
    });

    this.app.use('/api/solar-calculator', solarRoutes.router);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`Solar Calculator Service started`, {
        port: this.port,
        environment: process.env['NODE_ENV'],
        nodeVersion: process.version,
        service: 'solar-calculator-service'
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      process.exit(1);
    });
  }
}

const server = new SolarCalculatorServer();
server.start();