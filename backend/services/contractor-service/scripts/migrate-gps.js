const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// RABHAN Contractor Service - Run GPS Coordinates Migration

const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '12345',
  database: process.env.DATABASE_NAME || 'rabhan_contractors'
};

async function runGPSMigration() {
  const pool = new Pool(config);
  
  try {
    console.log('🌍 Running GPS coordinates migration...');
    
    // Read the GPS migration file
    const migrationPath = path.join(__dirname, '../migrations/003_add_gps_coordinates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(migrationSQL);
    console.log('✅ GPS coordinates migration completed successfully');
    
    // Verify columns were added
    console.log('🔍 Verifying GPS columns...');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
        AND column_name IN ('latitude', 'longitude')
      ORDER BY column_name
    `);
    
    if (columns.rows.length === 2) {
      console.log('📋 GPS columns added successfully:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.warn('⚠️ Expected 2 GPS columns but found:', columns.rows.length);
    }
    
  } catch (error) {
    if (error.message.includes('column "latitude" of relation "contractors" already exists')) {
      console.log('✅ GPS columns already exist - migration already applied');
    } else {
      console.error('❌ Error running GPS migration:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Run migration
runGPSMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
