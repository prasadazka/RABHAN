#!/usr/bin/env node

const { Client } = require('pg');

async function checkEnums() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log('🔍 Checking available enum values...\n');

    // Get all enum types
    const enumsResult = await client.query(`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `);

    const enums = {};
    enumsResult.rows.forEach(row => {
      if (!enums[row.enum_name]) {
        enums[row.enum_name] = [];
      }
      enums[row.enum_name].push(row.enum_value);
    });

    for (const [enumName, values] of Object.entries(enums)) {
      console.log(`📋 ${enumName}:`);
      values.forEach(value => console.log(`  - ${value}`));
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkEnums().catch(console.error);