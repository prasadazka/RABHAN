const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    
    // Check if our databases exist
    const dbCheck = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datname IN ('rabhan_auth', 'rabhan_documents', 'rabhan_users')
    `);
    
    console.log('\nRABHAN Databases:');
    if (dbCheck.rows.length === 0) {
      console.log('❌ No RABHAN databases found. Run setup-local-db.bat first.');
    } else {
      dbCheck.rows.forEach(row => {
        console.log('✅', row.datname);
      });
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.log('\nMake sure PostgreSQL is running with:');
    console.log('- Host: localhost');
    console.log('- Port: 5432');
    console.log('- Username: postgres');
    console.log('- Password: 12345');
  } finally {
    await client.end();
  }
}

// Run from any service directory: node ../../../scripts/test-postgresql.js
testConnection();