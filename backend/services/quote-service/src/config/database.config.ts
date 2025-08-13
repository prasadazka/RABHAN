import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: Pool | null = null;
  private readonly config: PoolConfig;

  private constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'quote_service_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '12345',
      
      // Connection pool settings for high performance
      min: parseInt(process.env.DB_POOL_MIN || '10', 10),
      max: parseInt(process.env.DB_POOL_MAX || '50', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '15000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Application name for monitoring
      application_name: 'quote-service'
    };
  }

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async getPool(): Promise<Pool> {
    if (!this.pool) {
      try {
        this.pool = new Pool(this.config);
        
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        logger.info('✅ Database connection pool established successfully', {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          poolSize: {
            min: this.config.min,
            max: this.config.max
          }
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
          logger.error('💥 Database pool error:', err);
        });

        this.pool.on('connect', () => {
          logger.debug('🔗 New client connected to database pool');
        });

        this.pool.on('remove', () => {
          logger.debug('📤 Client removed from database pool');
        });

      } catch (error) {
        logger.error('❌ Failed to create database pool:', error);
        throw new Error(`Database connection failed: ${error}`);
      }
    }
    
    return this.pool;
  }

  public async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('🔒 Database connection pool closed');
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const pool = await this.getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('📊 Database query executed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('💥 Database query failed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  public async getClient() {
    const pool = await this.getPool();
    return await pool.connect();
  }
}

export const database = DatabaseConfig.getInstance();