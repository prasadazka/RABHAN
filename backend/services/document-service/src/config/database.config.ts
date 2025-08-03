import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './environment.config';
import { logger } from '../utils/logger';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    const poolConfig: PoolConfig = {
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      connectionTimeoutMillis: config.database.connectionTimeout,
      idleTimeoutMillis: config.database.idleTimeout,
      allowExitOnIdle: false,
      
      // SSL configuration for production
      ssl: config.isProduction ? {
        rejectUnauthorized: false,
        ca: process.env.DATABASE_SSL_CA,
        key: process.env.DATABASE_SSL_KEY,
        cert: process.env.DATABASE_SSL_CERT,
      } : false,
    };

    this.pool = new Pool(poolConfig);
    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.info('Database client connected', {
        processId: client.processID,
        database: this.getDatabaseName(),
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Database client acquired', {
        processId: client.processID,
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('Database client removed', {
        processId: client.processID,
      });
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Database pool error:', {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      
      logger.info('Database connected successfully', {
        currentTime: result.rows[0]?.current_time,
        version: result.rows[0]?.version?.split(' ')[0],
        poolSize: this.pool.totalCount,
        database: this.getDatabaseName(),
      });
      
      client.release();
      this.isConnected = true;
    } catch (error) {
      logger.error('Database connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      poolSize: number;
      idleCount: number;
      waitingCount: number;
      responseTime: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          poolSize: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
          responseTime,
        },
      };
    } catch (error) {
      logger.error('Database health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          poolSize: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  public async runTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  public async query(
    text: string,
    params?: any[],
    client?: PoolClient
  ): Promise<any> {
    const startTime = Date.now();
    const queryClient = client || this.pool;
    
    try {
      const result = await queryClient.query(text, params);
      const duration = Date.now() - startTime;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0,
        rows: result.rowCount,
        duration,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async migrate(): Promise<void> {
    try {
      logger.info('Starting database migration...');
      
      // Check if migration table exists
      const migrationTableExists = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        );
      `);
      
      if (!migrationTableExists.rows[0].exists) {
        // Create migration table
        await this.query(`
          CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('Migration table created');
      }
      
      // Run pending migrations
      const fs = require('fs');
      const path = require('path');
      const migrationsDir = path.join(__dirname, '../../migrations');
      
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter((file: string) => file.endsWith('.sql'))
          .sort();
        
        for (const file of migrationFiles) {
          const executed = await this.query(
            'SELECT id FROM migrations WHERE filename = $1',
            [file]
          );
          
          if (executed.rows.length === 0) {
            logger.info(`Running migration: ${file}`);
            const migrationSql = fs.readFileSync(
              path.join(migrationsDir, file),
              'utf8'
            );
            
            await this.runTransaction(async (client) => {
              await client.query(migrationSql);
              await client.query(
                'INSERT INTO migrations (filename) VALUES ($1)',
                [file]
              );
            });
            
            logger.info(`Migration completed: ${file}`);
          }
        }
      }
      
      logger.info('Database migration completed successfully');
    } catch (error) {
      logger.error('Database migration failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private getDatabaseName(): string {
    try {
      const url = new URL(config.database.url);
      return url.pathname.substring(1); // Remove leading slash
    } catch {
      return 'unknown';
    }
  }

  public isHealthy(): boolean {
    return this.isConnected && this.pool.totalCount > 0;
  }

  public getConnectionInfo(): {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
    isConnected: boolean;
  } {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      isConnected: this.isConnected,
    };
  }
}