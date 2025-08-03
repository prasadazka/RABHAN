#!/usr/bin/env node

/**
 * Create all databases for RABHAN microservices
 */

const { Client } = require('pg');

const databases = [
  { name: 'rabhan_auth', description: 'Authentication Service' },
  { name: 'rabhan_user', description: 'User Profile Service' },
  { name: 'rabhan_document', description: 'Document Management Service' }
];

async function createAllDatabases() {
  console.log('🚀 Creating RABHAN Databases');
  console.log('============================\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    for (const db of databases) {
      try {
        // Check if database exists
        const result = await client.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [db.name]
        );

        if (result.rows.length === 0) {
          console.log(`📦 Creating database: ${db.name} (${db.description})`);
          await client.query(`CREATE DATABASE "${db.name}"`);
          console.log(`✅ Database ${db.name} created successfully`);
        } else {
          console.log(`✅ Database ${db.name} already exists`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${db.name}:`, error.message);
      }
    }

    console.log('\n🎉 All databases created successfully!');
    console.log('\n📋 Created databases:');
    databases.forEach(db => {
      console.log(`   • ${db.name} - ${db.description}`);
    });

  } catch (error) {
    console.error('❌ Database creation failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAllDatabases();