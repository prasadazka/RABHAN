#!/usr/bin/env node

/**
 * Fix electricity consumption column to accept any string
 * Changes from enum to VARCHAR(50)
 */

const { Client } = require('pg');
require('dotenv').config();

async function fixElectricityConsumption() {
  console.log('🔧 Fixing electricity consumption column');
  console.log('=====================================\n');

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

    // Change the column type from enum to VARCHAR
    console.log('🔄 Changing electricity_consumption from enum to VARCHAR...');
    await client.query(`
      ALTER TABLE user_profiles 
      ALTER COLUMN electricity_consumption TYPE VARCHAR(50) 
      USING electricity_consumption::text;
    `);
    console.log('✅ Column type changed to VARCHAR(50)\n');

    console.log('🎉 Electricity consumption column fixed!');
    console.log('\n✅ Now accepts any string up to 50 characters');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
fixElectricityConsumption();