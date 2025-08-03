#!/usr/bin/env node

/**
 * RABHAN DATABASE SETUP SCRIPT
 * Creates the necessary databases for RABHAN services
 */

const { Client } = require('pg');

const requiredDatabases = [
  'rabhan_auth',
  'rabhan_user', 
  'rabhan_contractors',
  'rabhan_documents'
];

async function setupDatabases() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Connect to default postgres database first
    user: 'postgres',
    password: '12345'
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check existing databases
    const result = await client.query(
      "SELECT datname FROM pg_database WHERE datname LIKE 'rabhan_%'"
    );
    
    const existingDbs = result.rows.map(row => row.datname);
    console.log('\n📊 Existing RABHAN databases:', existingDbs);

    // Create missing databases
    for (const dbName of requiredDatabases) {
      if (!existingDbs.includes(dbName)) {
        console.log(`\n🔨 Creating database: ${dbName}`);
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Created database: ${dbName}`);
      } else {
        console.log(`✅ Database already exists: ${dbName}`);
      }
    }

    console.log('\n🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code === '28P01') {
      console.log('\n💡 Tip: Make sure PostgreSQL password is set to "postgres"');
      console.log('Or update the password in this script to match your setup');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  setupDatabases().catch(console.error);
}

module.exports = { setupDatabases };