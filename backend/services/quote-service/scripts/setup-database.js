/**
 * Database Setup Script for Quote Service
 * This script creates the database and runs migrations
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
  database: 'postgres' // Connect to default database first
};

const QUOTE_DB_NAME = 'quote_service_db';

async function createDatabase() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('🔗 Connected to PostgreSQL server');
    
    // Check if database exists
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [QUOTE_DB_NAME]
    );
    
    if (checkDb.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${QUOTE_DB_NAME}`);
      console.log(`✅ Database '${QUOTE_DB_NAME}' created successfully`);
    } else {
      console.log(`📦 Database '${QUOTE_DB_NAME}' already exists`);
    }
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runMigrations() {
  // Connect to the quote service database
  const client = new Client({
    ...config,
    database: QUOTE_DB_NAME
  });
  
  try {
    await client.connect();
    console.log(`🔗 Connected to '${QUOTE_DB_NAME}' database`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_quote_tables_simplified.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('🚀 Running migrations...');
    
    // Split the migration file by semicolons but preserve semicolons within functions
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      try {
        await client.query(statement);
        
        // Log important operations
        if (statement.includes('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
          if (tableMatch) {
            console.log(`  ✅ Table '${tableMatch[1]}' created or verified`);
          }
        } else if (statement.includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE INDEX (\w+)/i);
          if (indexMatch) {
            console.log(`  ✅ Index '${indexMatch[1]}' created`);
          }
        } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          const functionMatch = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/i);
          if (functionMatch) {
            console.log(`  ✅ Function '${functionMatch[1]}' created`);
          }
        } else if (statement.includes('CREATE OR REPLACE VIEW')) {
          const viewMatch = statement.match(/CREATE OR REPLACE VIEW (\w+)/i);
          if (viewMatch) {
            console.log(`  ✅ View '${viewMatch[1]}' created`);
          }
        }
      } catch (err) {
        // Handle specific errors gracefully
        if (err.message.includes('already exists')) {
          console.log(`  ℹ️  ${err.message.split('\n')[0]} (skipping)`);
        } else {
          console.error(`  ❌ Error executing statement:`, err.message);
          console.error(`     Statement preview: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('✅ All migrations completed successfully');
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Database tables created:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check business configuration
    const configCheck = await client.query(
      `SELECT config_key, config_value FROM business_config WHERE is_active = true`
    );
    
    console.log('\n⚙️  Business Configuration:');
    configCheck.rows.forEach(row => {
      console.log(`  - ${row.config_key}: ${JSON.stringify(row.config_value)}`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    console.log('🏗️  Setting up Quote Service Database...\n');
    
    // Step 1: Create database
    await createDatabase();
    
    // Step 2: Run migrations
    await runMigrations();
    
    console.log('\n✨ Database setup completed successfully!');
    console.log(`📝 Connection string: postgresql://${config.user}:****@${config.host}:${config.port}/${QUOTE_DB_NAME}`);
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main();