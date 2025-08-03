#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function checkDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rabhan_auth',
    ssl: false
  });

  try {
    console.log('🔍 Checking Auth Service Database Structure...\n');
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('📅 Current time:', result.rows[0].now);
    console.log();

    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Current Tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.table_type})`);
      });
    }
    console.log();

    // Check for users table specifically
    const usersTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users';
    `);

    console.log('👤 Users Table Status:');
    if (usersTableCheck.rows.length === 0) {
      console.log('   ❌ Users table does NOT exist');
    } else {
      console.log('   ✅ Users table exists');
    }

    // Check for contractors table
    const contractorsTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'contractors';
    `);

    console.log('🏗️  Contractors Table Status:');
    if (contractorsTableCheck.rows.length === 0) {
      console.log('   ❌ Contractors table does NOT exist');
    } else {
      console.log('   ✅ Contractors table exists');
      
      // Check contractors table structure
      const contractorsStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'contractors'
        ORDER BY ordinal_position;
      `);
      
      console.log('   📊 Contractors table columns:');
      contractorsStructure.rows.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    console.log();

    // Check for enum types
    const enumsResult = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      ORDER BY typname;
    `);

    console.log('🔢 Custom Enum Types:');
    if (enumsResult.rows.length === 0) {
      console.log('   No custom enum types found');
    } else {
      enumsResult.rows.forEach(row => {
        console.log(`   - ${row.typname}`);
      });
    }
    console.log();

    // Check for functions
    const functionsResult = await pool.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY proname;
    `);

    console.log('⚙️  Custom Functions:');
    if (functionsResult.rows.length === 0) {
      console.log('   No custom functions found');
    } else {
      functionsResult.rows.forEach(row => {
        console.log(`   - ${row.proname}()`);
      });
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();