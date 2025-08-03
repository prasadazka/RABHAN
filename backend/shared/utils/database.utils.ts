import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

export class DatabaseUtils {
  
  static async withTransaction<T>(
    pool: Pool, 
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async withTransactionAndRetry<T>(
    pool: Pool,
    operation: (client: PoolClient) => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await this.withTransaction(pool, operation);
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        const isRetryableError = error instanceof Error && (
          error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('deadlock')
        );
        
        if (!isRetryableError) {
          throw error;
        }
        
        logger.warn(`Transaction attempt ${attempt} failed, retrying...`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  static formatSQLError(error: any): { message: string; code?: string; constraint?: string } {
    if (error?.code === '23505') {
      const match = error.detail?.match(/Key \((.+)\)=\((.+)\) already exists/);
      if (match) {
        const field = match[1];
        const value = match[2];
        return {
          message: `${field} '${value}' already exists`,
          code: 'DUPLICATE_KEY',
          constraint: error.constraint
        };
      }
      return {
        message: 'Duplicate entry found',
        code: 'DUPLICATE_KEY',
        constraint: error.constraint
      };
    }
    
    if (error?.code === '23503') {
      return {
        message: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
        constraint: error.constraint
      };
    }
    
    if (error?.code === '23502') {
      return {
        message: 'Required field is missing',
        code: 'NOT_NULL_VIOLATION',
        constraint: error.constraint
      };
    }
    
    return {
      message: error?.message || 'Database error occurred',
      code: error?.code
    };
  }

  static buildSelectQuery(
    table: string,
    columns: string[] = ['*'],
    conditions: Record<string, any> = {},
    options: {
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): { query: string; values: any[] } {
    const selectColumns = columns.join(', ');
    let query = `SELECT ${selectColumns} FROM ${table}`;
    const values: any[] = [];
    let paramCount = 0;
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => {
          paramCount++;
          values.push(conditions[key]);
          return `${key} = $${paramCount}`;
        })
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      paramCount++;
      values.push(options.limit);
      query += ` LIMIT $${paramCount}`;
    }
    
    if (options.offset) {
      paramCount++;
      values.push(options.offset);
      query += ` OFFSET $${paramCount}`;
    }
    
    return { query, values };
  }

  static buildInsertQuery(
    table: string,
    data: Record<string, any>,
    returning: string[] = ['*']
  ): { query: string; values: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const returningClause = returning.join(', ');
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING ${returningClause}
    `;
    
    return { query, values };
  }

  static buildUpdateQuery(
    table: string,
    data: Record<string, any>,
    conditions: Record<string, any>,
    returning: string[] = ['*']
  ): { query: string; values: any[] } {
    const setColumns = Object.keys(data);
    const conditionColumns = Object.keys(conditions);
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const setClause = setColumns
      .map((col, index) => `${col} = $${index + 1}`)
      .join(', ');
    
    const whereClause = conditionColumns
      .map((col, index) => `${col} = $${setColumns.length + index + 1}`)
      .join(' AND ');
    
    const returningClause = returning.join(', ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING ${returningClause}
    `;
    
    return { query, values };
  }
}