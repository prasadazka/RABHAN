#!/usr/bin/env node

/**
 * RABHAN MIGRATION RUNNER
 * Runs all SQL migrations for RABHAN services
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const services = [
  {
    name: 'auth-service',
    database: 'rabhan_auth',
    path: 'backend/services/auth-service/migrations'
  },
  {
    name: 'user-service', 
    database: 'rabhan_user',
    path: 'backend/services/user-service/migrations'
  },
  {
    name: 'contractor-service',
    database: 'rabhan_contractors', 
    path: 'backend/services/contractor-service/migrations'
  },
  {
    name: 'document-service',
    database: 'rabhan_documents',
    path: 'backend/services/document-service/migrations'
  }
];

async function runMigrationsForService(service) {
  console.log(`\n🔨 Running migrations for ${service.name}...`);
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: service.database,
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log(`✅ Connected to ${service.database}`);

    // Check if migrations directory exists
    const migrationsPath = path.join(process.cwd(), service.path);
    if (!fs.existsSync(migrationsPath)) {
      console.log(`⚠️  No migrations directory found for ${service.name}`);
      return;
    }

    // Get all SQL files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log(`⚠️  No SQL migration files found for ${service.name}`);
      return;
    }

    // Run each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`  📄 Running ${file}...`);
      
      try {
        await client.query(sql);
        console.log(`  ✅ ${file} completed successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${file} - objects already exist (skipping)`);
        } else {
          console.error(`  ❌ ${file} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log(`✅ All migrations completed for ${service.name}`);

  } catch (error) {
    console.error(`❌ Migration failed for ${service.name}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting RABHAN database migrations...');
  console.log('============================================');

  for (const service of services) {
    try {
      await runMigrationsForService(service);
    } catch (error) {
      console.error(`❌ Failed to migrate ${service.name}, continuing with others...`);
    }
  }

  console.log('\n🎉 Migration process completed!');
  console.log('\n📊 Verifying table creation...');
  
  // Verify tables were created
  for (const service of services) {
    try {
      const client = new Client({
        host: 'localhost',
        port: 5432,
        database: service.database,
        user: 'postgres',
        password: '12345'
      });
      
      await client.connect();
      const result = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
      );
      
      console.log(`${service.name}: ${result.rows.length} tables created`);
      await client.end();
    } catch (error) {
      console.error(`❌ Could not verify ${service.name}:`, error.message);
    }
  }
}

if (require.main === module) {
  runAllMigrations().catch(console.error);
}

module.exports = { runAllMigrations };