const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from .env
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_user',
  user: 'postgres',
  password: '12345',
});

async function applyMigration() {
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'migrations', '003_add_employment_and_solar_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Applying migration: 003_add_employment_and_solar_fields.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name IN ('employment_status', 'employer_name', 'job_title', 'desired_system_size', 'budget_range')
      ORDER BY column_name
    `);
    
    console.log('📋 New columns added:', result.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Migration may have already been applied');
    }
  } finally {
    await pool.end();
  }
}

applyMigration();