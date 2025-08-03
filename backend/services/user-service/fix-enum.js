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

async function fixEnum() {
  try {
    console.log('🔄 Fixing employment_status enum values...');
    
    // Read the fix SQL
    const fixPath = path.join(__dirname, 'fix-enum-values.sql');
    const fixSQL = fs.readFileSync(fixPath, 'utf8');
    
    // Execute the fix
    await pool.query(fixSQL);
    
    console.log('✅ Enum values fixed successfully!');
    
    // Verify the enum values
    const result = await pool.query(`
      SELECT unnest(enum_range(NULL::employment_status)) as enum_value
    `);
    
    console.log('📋 Current enum values:', result.rows.map(r => r.enum_value));
    
  } catch (error) {
    console.error('❌ Enum fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

fixEnum();