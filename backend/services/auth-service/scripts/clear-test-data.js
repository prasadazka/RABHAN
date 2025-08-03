#!/usr/bin/env node

/**
 * Clear test data from RABHAN databases
 * Deletes all user records to allow re-registration
 */

const { Client } = require('pg');

async function clearDatabase(dbConfig, tablesToClear, description) {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log(`✅ Connected to ${description}\n`);

    for (const table of tablesToClear) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`🗑️  Cleared ${result.rowCount} records from ${table}`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  Table ${table} doesn't exist - skipping`);
        } else {
          console.log(`❌ Error clearing ${table}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to connect to ${description}:`, error.message);
  } finally {
    await client.end();
  }
}

async function clearAllTestData() {
  console.log('🧹 Clearing RABHAN Test Data');
  console.log('============================\n');

  // Auth Service Database
  await clearDatabase(
    {
      host: 'localhost',
      port: 5432,
      database: 'rabhan_auth',
      user: 'postgres',
      password: '12345'
    },
    [
      'user_sessions',
      'password_reset_tokens', 
      'sama_compliance_logs',
      'users'
    ],
    'Auth Service Database'
  );

  console.log();

  // User Service Database
  await clearDatabase(
    {
      host: 'localhost',
      port: 5432,
      database: 'rabhan_user',
      user: 'postgres',
      password: '12345'
    },
    [
      'user_activities',
      'user_documents',
      'user_profiles'
    ],
    'User Service Database'
  );

  console.log();

  // Document Service Database
  await clearDatabase(
    {
      host: 'localhost',
      port: 5432,
      database: 'rabhan_document',
      user: 'postgres',
      password: '12345'
    },
    [
      'document_access_log',
      'document_versions',
      'document_tags',
      'virus_scan_results',
      'approval_workflows',
      'sama_audit_events',
      'documents'
    ],
    'Document Service Database'
  );

  console.log('\n🎉 All test data cleared successfully!');
  console.log('\n✅ You can now register again with the same credentials:');
  console.log('   📧 Same email address');
  console.log('   📱 Same phone number (+919182614577)');
  console.log('   🔑 Same password');
  console.log('\n🚀 Try the registration flow again!');
}

// Run the cleanup
clearAllTestData();