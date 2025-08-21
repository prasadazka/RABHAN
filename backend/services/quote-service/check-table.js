const { Pool } = require('pg');
require('dotenv').config();

async function checkTable() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Check if table exists and get column info
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'quote_requests' 
      ORDER BY ordinal_position;
    `);
    
    console.log('quote_requests table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('Error checking table:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();