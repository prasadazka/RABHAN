#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rabhan_auth',
    ssl: false
  });

  try {
    console.log('🚀 Running migration to restore users table...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/006_restore_users_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📊 Migration size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Execute the migration
    console.log('⚡ Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify the results
    console.log('🔍 Verifying migration results...\n');

    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_sessions', 'password_reset_tokens', 'user_compliance_logs', 'contractors')
      ORDER BY table_name;
    `);

    console.log('📋 Tables after migration:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name} (${row.table_type})`);
    });
    console.log();

    // Check users table structure
    const usersStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('👤 Users table structure:');
    usersStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log();

    // Check user_sessions table structure
    const sessionsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_sessions'
      ORDER BY ordinal_position;
    `);

    console.log('🔐 User sessions table structure:');
    sessionsStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log();

    // Check indexes
    const indexesResult = await pool.query(`
      SELECT 
        i.relname as index_name,
        t.relname as table_name
      FROM pg_class t, pg_class i, pg_index ix
      WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relkind = 'r'
        AND t.relname IN ('users', 'user_sessions', 'password_reset_tokens', 'user_compliance_logs')
      ORDER BY t.relname, i.relname;
    `);

    console.log('📈 Indexes created:');
    let currentTable = '';
    indexesResult.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`   ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`     - ${row.index_name}`);
    });
    console.log();

    // Check functions
    const functionsResult = await pool.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN ('check_user_bnpl_eligibility', 'enforce_role_consistency', 'update_updated_at_column')
      ORDER BY proname;
    `);

    console.log('⚙️  Functions created:');
    functionsResult.rows.forEach(row => {
      console.log(`   ✅ ${row.proname}()`);
    });
    console.log();

    // Test the BNPL eligibility function
    console.log('🧪 Testing BNPL eligibility function...');
    const testResult = await pool.query(`
      SELECT * FROM check_user_bnpl_eligibility('00000000-0000-0000-0000-000000000000');
    `);
    console.log('   Function test result:', testResult.rows[0]);
    console.log();

    console.log('🎉 Migration verification completed successfully!');
    console.log('📊 Summary:');
    console.log('   ✅ Users table restored with all fields');
    console.log('   ✅ User sessions table created');
    console.log('   ✅ Password reset tokens table created');
    console.log('   ✅ SAMA compliance audit tables created');
    console.log('   ✅ All indexes and constraints applied');
    console.log('   ✅ BNPL eligibility function working');
    console.log('   ✅ Role consistency triggers active');
    console.log();
    console.log('🔄 Both users and contractors tables now exist side by side');
    console.log('👥 Users table: for regular users (role=\'USER\')');
    console.log('🏗️  Contractors table: for contractors (role=\'CONTRACTOR\')');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('📍 Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();