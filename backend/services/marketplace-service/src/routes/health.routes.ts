/**
 * RABHAN Marketplace Service - Health Check Routes
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { Router, Request, Response } from 'express';
import { db } from '@/config/database.config';
import { logger } from '@/utils/logger';
import { ServiceHealth } from '@/types/marketplace.types';

const router = Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const health: ServiceHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: false,
        latency: undefined
      },
      dependencies: {}
    };

    // Quick database connectivity check
    try {
      const dbStartTime = process.hrtime.bigint();
      await db.query('SELECT 1 as health_check');
      const dbLatency = Number(process.hrtime.bigint() - dbStartTime) / 1000000;
      
      health.database.connected = true;
      health.database.latency = dbLatency;
      
      // Check if database performance is degraded
      if (dbLatency > 10) { // >10ms is considered degraded for our sub-2ms target
        health.status = 'degraded';
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.database.connected = false;
      logger.error('Database health check failed', error);
    }

    // Performance monitoring
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

    // Log health check performance
    logger.auditPerformance('HEALTH_CHECK', duration, {
      status: health.status,
      dbConnected: health.database.connected,
      dbLatency: health.database.latency
    });

  } catch (error) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    logger.error('Health check failed', error, {
      performanceMetrics: { duration }
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: process.uptime()
    });
  }
});

/**
 * Detailed health check endpoint (Admin only)
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const health: ServiceHealth & {
      memory: NodeJS.MemoryUsage;
      cpu: {
        usage: number;
      };
      database: {
        connected: boolean;
        latency?: number;
        pool?: {
          total: number;
          idle: number;
          waiting: number;
        };
      };
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      cpu: {
        usage: process.cpuUsage().user / 1000000 // Convert to ms
      },
      database: {
        connected: false,
        latency: undefined
      },
      dependencies: {}
    };

    // Database health check with connection pool info
    try {
      const dbStartTime = process.hrtime.bigint();
      await db.query('SELECT 1 as health_check');
      const dbLatency = Number(process.hrtime.bigint() - dbStartTime) / 1000000;
      
      health.database.connected = true;
      health.database.latency = dbLatency;
      
      // Get connection pool status
      if (db.pool) {
        health.database.pool = {
          total: db.pool.totalCount,
          idle: db.pool.idleCount,
          waiting: db.pool.waitingCount
        };
      }
      
      // Performance degradation checks
      if (dbLatency > 10) {
        health.status = 'degraded';
      }
      
      // Memory usage check (>500MB is concerning)
      if (health.memory.heapUsed > 500 * 1024 * 1024) {
        health.status = 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.database.connected = false;
      logger.error('Detailed database health check failed', error);
    }

    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

    // Log detailed health check
    logger.auditPerformance('DETAILED_HEALTH_CHECK', duration, {
      status: health.status,
      memoryUsageMB: Math.round(health.memory.heapUsed / 1024 / 1024),
      dbLatency: health.database.latency
    });

  } catch (error) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    logger.error('Detailed health check failed', error, {
      performanceMetrics: { duration }
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

/**
 * Readiness check endpoint (for Kubernetes/container orchestration)
 * GET /health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Database not accessible'
    });
  }
});

/**
 * Liveness check endpoint (for Kubernetes/container orchestration)
 * GET /health/live
 */
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export { router as healthRoutes };