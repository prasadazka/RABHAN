const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres', 
  password: '12345',
  database: 'rabhan_contractors'
});

async function checkTable() {
  try {
    console.log('🔍 Checking contractors table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Contractors table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'}, nullable: ${row.is_nullable})`);
    });
    
    // Check for verification_status specifically
    const verificationCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
        AND column_name = 'verification_status'
    `);
    
    console.log(`\n✨ Verification status column exists: ${verificationCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // Check existing status enum values
    const enumCheck = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'contractor_status'
      )
      ORDER BY enumsortorder
    `);
    
    console.log('\n📝 Contractor status enum values:');
    enumCheck.rows.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();