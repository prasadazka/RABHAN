#!/usr/bin/env node

/**
 * Add Profile Completion Function to User Service Database
 * Adds the calculate_profile_completion function that was missing
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addProfileCompletionFunction() {
  console.log('🔧 Adding Profile Completion Function to Database');
  console.log('================================================\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_user',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'fix_profile_completion.sql');
    console.log('📄 Reading SQL file:', sqlFilePath);
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file read successfully\n');

    // Execute the SQL
    console.log('⚡ Creating calculate_profile_completion function...');
    await client.query(sqlContent);
    console.log('✅ Function created successfully\n');

    // Test the function
    console.log('🧪 Testing the function...');
    const testResult = await client.query(`
      SELECT calculate_profile_completion('00000000-0000-0000-0000-000000000000'::UUID) as completion;
    `);
    console.log('✅ Function test completed. Result:', testResult.rows[0].completion);

    console.log('\n🎉 Profile completion function setup completed!');
    console.log('✅ The calculate_profile_completion function is now available');
    console.log('✅ Profile updates should work without errors');

  } catch (error) {
    console.error('❌ Function setup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
addProfileCompletionFunction();