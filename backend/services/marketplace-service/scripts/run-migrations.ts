/**
 * RABHAN Marketplace Service - Database Migration Runner
 * SAMA Compliant | Zero-Trust Security | Sub-2ms Performance
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { db } from '../src/config/database.config';
import { logger } from '../src/utils/logger';

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private migrationsDir: string;
  private migrationsTable = 'schema_migrations';

  constructor() {
    this.migrationsDir = join(__dirname, '..', 'migrations');
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
      ON ${this.migrationsTable}(applied_at);
    `;

    await db.query(sql);
    logger.info('Migration tracking table initialized');
  }

  /**
   * Get list of migration files
   */
  private getMigrationFiles(): Migration[] {
    if (!existsSync(this.migrationsDir)) {
      logger.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to ensure proper order

    return files.map(filename => {
      const filePath = join(this.migrationsDir, filename);
      const sql = readFileSync(filePath, 'utf-8');
      const id = filename.replace('.sql', '');

      return { id, filename, sql };
    });
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await db.query(`SELECT id FROM ${this.migrationsTable} ORDER BY applied_at`);
      return result.rows.map(row => row.id);
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Calculate SQL checksum for integrity verification
   */
  private calculateChecksum(sql: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(sql.trim()).digest('hex').substring(0, 16);
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    const checksum = this.calculateChecksum(migration.sql);

    logger.info(`Applying migration: ${migration.filename}`);

    try {
      // Begin transaction
      await db.query('BEGIN');

      // Execute migration SQL
      await db.query(migration.sql);

      // Record migration
      const executionTime = Date.now() - startTime;
      await db.query(
        `INSERT INTO ${this.migrationsTable} (id, filename, checksum, execution_time_ms) 
         VALUES ($1, $2, $3, $4)`,
        [migration.id, migration.filename, checksum, executionTime]
      );

      // Commit transaction
      await db.query('COMMIT');

      logger.info(`Migration applied successfully: ${migration.filename} (${executionTime}ms)`, {
        migrationId: migration.id,
        performanceMetrics: { duration: executionTime },
        checksum
      });

    } catch (error) {
      // Rollback transaction
      await db.query('ROLLBACK');
      
      logger.error(`Migration failed: ${migration.filename}`, error, {
        migrationId: migration.id,
        checksum
      });
      
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  private async verifyMigrations(): Promise<void> {
    logger.info('Verifying migration integrity...');

    const migrations = this.getMigrationFiles();
    const appliedResult = await db.query(`SELECT id, checksum FROM ${this.migrationsTable}`);
    const appliedMigrations = new Map(appliedResult.rows.map(row => [row.id, row.checksum]));

    for (const migration of migrations) {
      const appliedChecksum = appliedMigrations.get(migration.id);
      if (appliedChecksum) {
        const currentChecksum = this.calculateChecksum(migration.sql);
        if (appliedChecksum !== currentChecksum) {
          throw new Error(
            `Migration checksum mismatch for ${migration.filename}. ` +
            `Expected: ${appliedChecksum}, Current: ${currentChecksum}. ` +
            `Migration file may have been modified after application.`
          );
        }
      }
    }

    logger.info('Migration integrity verified successfully');
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migration process...');

      // Initialize database connection
      await db.initialize();
      logger.info('Database connection initialized for migrations');

      // Initialize migration tracking
      await this.initializeMigrationTable();

      // Get migrations and applied status
      const migrations = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();

      logger.info(`Found ${migrations.length} migration files, ${appliedMigrations.length} already applied`);

      // Verify existing migrations
      if (appliedMigrations.length > 0) {
        await this.verifyMigrations();
      }

      // Apply pending migrations
      const pendingMigrations = migrations.filter(m => !appliedMigrations.includes(m.id));

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to apply');
        return;
      }

      logger.info(`Applying ${pendingMigrations.length} pending migrations...`);

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      logger.info('All migrations applied successfully!', {
        totalMigrations: migrations.length,
        appliedCount: pendingMigrations.length
      });

    } catch (error) {
      logger.error('Migration process failed', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<void> {
    try {
      await db.initialize();
      await this.initializeMigrationTable();
      
      const migrations = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();

      console.log('\n=== MIGRATION STATUS ===');
      console.log(`Total migrations: ${migrations.length}`);
      console.log(`Applied migrations: ${appliedMigrations.length}`);
      console.log(`Pending migrations: ${migrations.length - appliedMigrations.length}`);

      console.log('\n=== MIGRATION DETAILS ===');
      for (const migration of migrations) {
        const status = appliedMigrations.includes(migration.id) ? '✅ APPLIED' : '⏳ PENDING';
        console.log(`${status} - ${migration.filename}`);
      }

      if (appliedMigrations.length > 0) {
        const appliedResult = await db.query(
          `SELECT filename, applied_at, execution_time_ms 
           FROM ${this.migrationsTable} 
           ORDER BY applied_at DESC 
           LIMIT 5`
        );

        console.log('\n=== RECENT MIGRATIONS ===');
        for (const row of appliedResult.rows) {
          console.log(`${row.filename} - Applied at ${row.applied_at} (${row.execution_time_ms}ms)`);
        }
      }

    } catch (error) {
      logger.error('Failed to get migration status', error);
      throw error;
    }
  }

  /**
   * Rollback last migration (use with extreme caution)
   */
  public async rollbackLastMigration(): Promise<void> {
    try {
      await db.initialize();
      const result = await db.query(
        `SELECT id, filename FROM ${this.migrationsTable} 
         ORDER BY applied_at DESC LIMIT 1`
      );

      if (result.rowCount === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0];
      
      logger.warn(`Rolling back migration: ${lastMigration.filename}`, {
        migrationId: lastMigration.id,
        riskLevel: 'HIGH'
      });

      // Remove from tracking table
      await db.query(`DELETE FROM ${this.migrationsTable} WHERE id = $1`, [lastMigration.id]);

      logger.warn(`Migration ${lastMigration.filename} removed from tracking. Manual schema cleanup may be required.`);

    } catch (error) {
      logger.error('Rollback failed', error);
      throw error;
    }
  }
}

// CLI interface
const runner = new MigrationRunner();

async function main() {
  const command = process.argv[2] || 'migrate';

  try {
    switch (command) {
      case 'migrate':
        await runner.runMigrations();
        break;
      
      case 'status':
        await runner.getMigrationStatus();
        break;
      
      case 'rollback':
        console.warn('⚠️  ROLLBACK IS DANGEROUS - Only removes tracking, does not undo schema changes');
        const confirm = process.argv[3];
        if (confirm !== '--confirm') {
          console.log('Use --confirm flag to proceed with rollback');
          process.exit(1);
        }
        await runner.rollbackLastMigration();
        break;
      
      default:
        console.log('Usage:');
        console.log('  npm run migrate        - Run pending migrations');
        console.log('  npm run migrate status - Show migration status');
        console.log('  npm run migrate rollback --confirm - Rollback last migration');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration command failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MigrationRunner };