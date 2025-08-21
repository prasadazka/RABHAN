const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing database connection...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'quote_service_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].version.substring(0, 50) + '...');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Connection config:', {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'quote_service_db',
      user: process.env.DB_USER || 'postgres'
    });
  } finally {
    await pool.end();
  }
}

testConnection();