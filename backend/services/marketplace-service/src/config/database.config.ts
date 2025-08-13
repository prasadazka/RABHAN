/**
 * RABHAN Marketplace Service - Database Configuration
 * SAMA Compliant | Zero-Trust Security | Extreme Performance
 */

import { Pool, PoolConfig } from 'pg';

// Note: Avoid importing logger here to prevent circular dependency
// Use console.log for database-level logging temporarily

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

class DatabaseManager {
  private _pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'rabhan_marketplace',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10)
    };
  }

  private validateConfiguration(): void {
    const required = ['host', 'database', 'user', 'password'];
    const missing = required.filter(key => !this.config[key as keyof DatabaseConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    }

    console.log('✅ Database configuration validated successfully');
  }

  /**
   * Initialize database connection pool with extreme performance settings
   * Target: Sub-2ms query response times
   */
  public async initialize(): Promise<void> {
    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        
        // Extreme Performance Settings
        max: this.config.maxConnections,           // Higher connection count
        min: 5,                                    // Keep warm connections
        connectionTimeoutMillis: 3000,            // Quick connection creation
        idleTimeoutMillis: this.config.idleTimeoutMs,

        // Connection optimization
        keepAlive: true,
        keepAliveInitialDelayMillis: 3000,

        // SSL Configuration for production
        ssl: this.config.ssl ? {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        } : false
      };

      this._pool = new Pool(poolConfig);

      // Connection event handlers
      this._pool.on('connect', (client) => {
        console.log('📦 New database client connected');
        
        // Optimize each connection for extreme performance
        client.query('SET statement_timeout = 5000').catch(() => {});    // 5s max query time
        client.query('SET lock_timeout = 2000').catch(() => {});         // 2s max lock wait
        client.query('SET work_mem = "64MB"').catch(() => {});           // Optimize sort operations
        client.query('SET random_page_cost = 1.1').catch(() => {});     // SSD optimization
        client.query('SET effective_cache_size = "2GB"').catch(() => {}); // Cache optimization
      });

      this._pool.on('error', (err) => {
        console.error('❌ Database connection error:', err);
      });

      this._pool.on('remove', () => {
        console.log('📤 Database client removed from pool');
      });

      // Test connection
      await this.testConnection();
      console.log(`✅ Database pool initialized successfully (${this.config.maxConnections} connections)`);

    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Test database connection and performance
   */
  private async testConnection(): Promise<void> {
    if (!this._pool) {
      throw new Error('Database pool not initialized');
    }

    const startTime = process.hrtime.bigint();
    
    try {
      const client = await this._pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      client.release();

      const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
      
      if (duration > 50) { // Alert if connection takes >50ms
        console.warn(`⚠️ Slow database connection: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`✅ Database connection test passed: ${duration.toFixed(2)}ms`);
      }

      console.log(`🔗 Connected to: ${result.rows[0]?.db_version?.substring(0, 50)}...`);

    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * Execute optimized query with performance monitoring
   */
  public async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number; duration: number }> {
    if (!this._pool) {
      throw new Error('Database pool not initialized');
    }

    const startTime = process.hrtime.bigint();
    
    try {
      const client = await this._pool.connect();
      const result = await client.query(text, params);
      client.release();

      const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms

      // Log slow queries for optimization (>2ms threshold)
      if (duration > 2) {
        console.warn(`⚠️ Slow query detected: ${duration.toFixed(3)}ms - Query: ${text.substring(0, 100)}`);
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        duration: duration
      };

    } catch (error: any) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      console.error(`❌ Query failed after ${duration.toFixed(3)}ms:`, error.message || error);
      console.error(`Query: ${text.substring(0, 100)}`);
      throw error;
    }
  }

  /**
   * Get database connection pool for transactions
   */
  public getPool(): Pool {
    if (!this._pool) {
      throw new Error('Database pool not initialized');
    }
    return this._pool;
  }

  /**
   * Get pool property (alias for getPool)
   */
  public get pool(): Pool {
    return this.getPool();
  }

  /**
   * Close database connections gracefully
   */
  public async close(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
      console.log('✅ Database connections closed');
    }
  }

  /**
   * Alias for close() method - ensures compatibility with pg Pool interface
   */
  public async end(): Promise<void> {
    return this.close();
  }

  /**
   * Get connection pool stats for monitoring
   */
  public getStats() {
    if (!this._pool) {
      return null;
    }

    return {
      totalCount: this._pool.totalCount,
      idleCount: this._pool.idleCount,
      waitingCount: this._pool.waitingCount
    };
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

export { databaseManager as db, DatabaseManager };
export type { DatabaseConfig };