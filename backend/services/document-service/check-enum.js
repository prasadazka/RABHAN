const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_document',
  password: '12345',
  port: 5432,
});

async function checkEnum() {
  try {
    console.log('=== Checking document_type_enum values ===');
    
    const result = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'document_type_enum'
      )
      ORDER BY enumlabel;
    `);
    
    console.log('Valid document_type_enum values:');
    result.rows.forEach(row => {
      console.log(`- "${row.enumlabel}"`);
    });
    
  } catch (error) {
    console.error('Error checking enum:', error.message);
  } finally {
    await pool.end();
  }
}

checkEnum();