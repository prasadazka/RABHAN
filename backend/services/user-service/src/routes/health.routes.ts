import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { CacheService } from '../services/cache.service';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();
const cacheService = new CacheService();
const authService = new AuthService();

// Basic health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      service: 'user-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: 'healthy'
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      service: 'user-service',
      status: 'unhealthy',
      error: 'Service health check failed'
    });
  }
});

// Detailed health check with dependencies
router.get('/health/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkCache(),
      checkAuthService()
    ]);

    const [databaseCheck, cacheCheck, authCheck] = checks;

    const health = {
      service: 'user-service',
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      status: 'healthy',
      checks: {
        database: databaseCheck.status === 'fulfilled' ? databaseCheck.value : { status: 'unhealthy', error: databaseCheck.reason },
        cache: cacheCheck.status === 'fulfilled' ? cacheCheck.value : { status: 'unhealthy', error: cacheCheck.reason },
        authService: authCheck.status === 'fulfilled' ? authCheck.value : { status: 'unhealthy', error: authCheck.reason }
      }
    };

    // Determine overall status
    const hasUnhealthyDependency = Object.values(health.checks).some(
      check => check.status === 'unhealthy'
    );

    if (hasUnhealthyDependency) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check failed', error);
    res.status(503).json({
      service: 'user-service',
      status: 'unhealthy',
      error: 'Service health check failed',
      responseTime: Date.now() - startTime
    });
  }
});

// Ready check (for Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to receive traffic
    const databaseConnected = await checkDatabase();
    
    if (databaseConnected.status === 'healthy') {
      res.status(200).json({
        service: 'user-service',
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        service: 'user-service',
        status: 'not ready',
        reason: 'Database not connected'
      });
    }
  } catch (error) {
    logger.error('Ready check failed', error);
    res.status(503).json({
      service: 'user-service',
      status: 'not ready',
      error: 'Service not ready'
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'user-service',
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const poolStats = await db.getPoolStats();
    
    const metrics = {
      service: 'user-service',
      timestamp: new Date().toISOString(),
      database: {
        pool: poolStats
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
      },
      cpu: {
        uptime: process.uptime(),
        load: process.cpuUsage()
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', error);
    res.status(503).json({
      service: 'user-service',
      error: 'Metrics collection failed'
    });
  }
});

// Helper functions
async function checkDatabase(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const pool = db.getPool();
    await pool.query('SELECT 1');
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkCache(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await cacheService.isHealthy();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkAuthService(): Promise<{ status: string; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await authService.isHealthy();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

export default router;