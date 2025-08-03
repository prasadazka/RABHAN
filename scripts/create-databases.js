const { Client } = require('pg');

async function createDatabases() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check existing databases
    const checkResult = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datname LIKE 'rabhan_%'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('Found existing RABHAN databases:');
      checkResult.rows.forEach(row => console.log('  -', row.datname));
      console.log('\nDropping existing databases...');
      
      // Drop existing databases
      for (const row of checkResult.rows) {
        await client.query(`DROP DATABASE IF EXISTS ${row.datname}`);
        console.log(`  ✅ Dropped ${row.datname}`);
      }
    }

    // Create databases
    console.log('\nCreating new databases...');
    
    const databases = ['rabhan_auth', 'rabhan_documents', 'rabhan_users'];
    
    for (const db of databases) {
      try {
        await client.query(`CREATE DATABASE ${db}`);
        console.log(`  ✅ Created ${db}`);
      } catch (err) {
        console.error(`  ❌ Error creating ${db}:`, err.message);
      }
    }

    // Verify creation
    console.log('\nVerifying databases...');
    const verifyResult = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datname LIKE 'rabhan_%'
      ORDER BY datname
    `);
    
    console.log('\n✅ Databases created successfully:');
    verifyResult.rows.forEach(row => console.log('  -', row.datname));

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nMake sure:');
    console.log('1. PostgreSQL is running');
    console.log('2. You can connect with username: postgres, password: 12345');
    console.log('3. PostgreSQL is listening on localhost:5432');
  } finally {
    await client.end();
  }
}

console.log('RABHAN Database Setup');
console.log('====================\n');
createDatabases();