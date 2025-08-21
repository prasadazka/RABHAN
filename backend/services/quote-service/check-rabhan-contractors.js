const { Pool } = require('pg');

async function checkRabhanContractors() {
  try {
    console.log('🔍 Checking contractors table in rabhan_contractors database...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    // Check table structure
    const tableResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contractors'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Contractors table structure in rabhan_contractors:');
    tableResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check actual data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM contractors');
    console.log(`\n📊 Total contractors: ${countResult.rows[0].count}`);
    
    // Check status values that exist
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM contractors 
      GROUP BY status
    `);
    console.log('\n📊 Contractors by status:');
    statusResult.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count}`);
    });
    
    // Get sample data to understand structure
    const sampleResult = await pool.query(`
      SELECT *
      FROM contractors
      LIMIT 2
    `);
    
    console.log('\n📋 Sample contractor data:');
    sampleResult.rows.forEach((contractor, index) => {
      console.log(`\nContractor ${index + 1}:`);
      Object.keys(contractor).forEach(key => {
        const value = contractor[key];
        console.log(`   ${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
      });
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRabhanContractors();