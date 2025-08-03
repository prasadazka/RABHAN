import { Pool, PoolConfig } from 'pg';
import { config } from './environment.config';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: Pool;
  private readonly poolConfig: PoolConfig = {
    connectionString: config.database.url,
    min: config.database.poolMin,
    max: config.database.poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 2000,
    query_timeout: 2000,
    application_name: 'rabhan-auth-service',
    ssl: config.isProduction ? { rejectUnauthorized: false } : false
  };

  private constructor() {
    this.pool = new Pool(this.poolConfig);
    this.setupPoolEventHandlers();
  }

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  private setupPoolEventHandlers(): void {
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    this.pool.on('connect', (client) => {
      client.query('SET statement_timeout = 2000');
      client.query('SET lock_timeout = 1000');
      client.query('SET idle_in_transaction_session_timeout = 60000');
      client.query('SET work_mem = "64MB"');
    });
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  public async closePool(): Promise<void> {
    await this.pool.end();
  }
}