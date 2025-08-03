import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// SAMA-compliant database configuration with enhanced security
const dbConfig: PoolConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'rabhan_contractors',
  user: process.env.DATABASE_USER || 'contractor_service',
  password: process.env.DATABASE_PASSWORD,
  
  // Performance optimization for Saudi scale
  max: 20,                        // Maximum connections
  min: 5,                         // Minimum connections
  idleTimeoutMillis: 30000,       // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT,
    cert: process.env.DATABASE_CLIENT_CERT,
    key: process.env.DATABASE_CLIENT_KEY
  } : false,
  
  // Connection validation
  application_name: 'rabhan_contractor_service',
  statement_timeout: 30000,       // 30 second query timeout
  query_timeout: 30000,           // 30 second query timeout
  
  // Additional performance settings
  options: process.env.NODE_ENV === 'production' 
    ? '-c default_transaction_isolation=read_committed -c timezone=Asia/Riyadh'
    : undefined
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Enhanced error handling with SAMA compliance logging
pool.on('error', (err: Error) => {
  logger.error('Database pool error', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    service: 'contractor-service',
    compliance_event: 'database_error',
    impact_level: 'high'
  });
});

pool.on('connect', (client) => {
  logger.info('New database client connected', {
    timestamp: new Date().toISOString(),
    service: 'contractor-service'
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    timestamp: new Date().toISOString(),
    pool_size: pool.totalCount,
    idle_count: pool.idleCount,
    waiting_count: pool.waitingCount
  });
});

pool.on('release', (client) => {
  logger.debug('Client released to pool', {
    timestamp: new Date().toISOString(),
    pool_size: pool.totalCount,
    idle_count: pool.idleCount
  });
});

// Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      logger.info('Database health check passed', {
        timestamp: new Date().toISOString(),
        db_time: result.rows[0].current_time,
        db_version: result.rows[0].db_version.split(' ')[0]
      });
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      service: 'contractor-service'
    });
    return false;
  }
};

// Graceful shutdown
export const closeDatabasePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed successfully', {
      timestamp: new Date().toISOString(),
      service: 'contractor-service'
    });
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      service: 'contractor-service'
    });
  }
};

// Performance monitoring
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    timestamp: new Date().toISOString()
  };
};

// Database query execution with monitoring
export const executeQuery = async (
  query: string, 
  params: any[] = [], 
  operation: string = 'unknown'
) => {
  const startTime = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(query, params);
    const duration = Date.now() - startTime;
    
    // Log slow queries (SAMA performance monitoring)
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        operation,
        duration,
        query: query.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
        service: 'contractor-service'
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database query error', {
      operation,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      query: query.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
      service: 'contractor-service'
    });
    throw error;
  } finally {
    client.release();
  }
};

export default pool;