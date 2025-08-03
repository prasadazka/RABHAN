const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_document',
  password: '12345',
  port: 5432,
});

async function checkSchema() {
  try {
    console.log('=== Checking documents table schema ===');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Documents table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if auth_user_id exists
    const authUserIdExists = result.rows.some(row => row.column_name === 'auth_user_id');
    console.log(`\nauth_user_id column exists: ${authUserIdExists}`);
    
    if (authUserIdExists) {
      const authUserIdColumn = result.rows.find(row => row.column_name === 'auth_user_id');
      console.log(`auth_user_id details:`, authUserIdColumn);
    }
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();