#!/usr/bin/env node

/**
 * Master Database Setup Script for RABHAN Microservices
 * Creates all databases and runs their respective setup scripts
 */

const { Client } = require('pg');
const { spawn } = require('child_process');
const path = require('path');

const databases = [
  { name: 'rabhan_auth', service: 'auth-service', description: 'Authentication Service' },
  { name: 'rabhan_user', service: 'user-service', description: 'User Profile Service' },
  { name: 'rabhan_document', service: 'document-service', description: 'Document Management Service' }
];

async function createDatabase(dbName) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Connect to default postgres database
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database ${dbName} created successfully`);
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }
  } catch (error) {
    console.error(`❌ Failed to create database ${dbName}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runServiceSetup(serviceName) {
  return new Promise((resolve, reject) => {
    const setupScript = path.join(__dirname, 'services', serviceName, 'scripts', 'setup-database.js');
    const serviceDir = path.join(__dirname, 'services', serviceName);
    
    console.log(`\n🔧 Setting up ${serviceName} tables...`);
    
    const child = spawn('node', ['scripts/setup-database.js'], {
      cwd: serviceDir,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${serviceName} setup completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${serviceName} setup failed with code ${code}\n`);
        reject(new Error(`Setup failed for ${serviceName}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Failed to start ${serviceName} setup:`, error.message);
      reject(error);
    });
  });
}

async function setupAllDatabases() {
  console.log('🚀 RABHAN Microservices Database Setup');
  console.log('=====================================\n');

  try {
    // Step 1: Create all databases
    console.log('📦 Creating databases...\n');
    for (const db of databases) {
      await createDatabase(db.name);
    }

    // Step 2: Run setup scripts for each service
    console.log('\n🔧 Setting up database schemas...\n');
    for (const db of databases) {
      console.log(`🔧 Setting up ${db.description}...`);
      await runServiceSetup(db.service);
    }

    console.log('🎉 All databases setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Auth Service (rabhan_auth) - Ready on port 3001');
    console.log('   ✅ User Service (rabhan_user) - Ready for port 3002');
    console.log('   ✅ Document Service (rabhan_document) - Ready for port 3003');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start all three services');
    console.log('   2. Test the complete registration flow');
    console.log('   3. Upload documents and verify KYC');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupAllDatabases();