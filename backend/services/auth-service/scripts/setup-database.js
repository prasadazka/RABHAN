#!/usr/bin/env node

/**
 * Database Setup Script for RABHAN Auth Service
 * Creates the necessary tables and structures with multi-country support
 */

const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up RABHAN Auth Service Database');
  console.log('==========================================\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Create enum types
    console.log('📋 Creating enum types...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('USER', 'CONTRACTOR', 'ADMIN', 'SUPER_ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE auth_provider AS ENUM ('EMAIL', 'NAFATH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Enum types created\n');

    // Create users table
    console.log('👥 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        phone VARCHAR(20),
        role user_role NOT NULL DEFAULT 'USER',
        status user_status NOT NULL DEFAULT 'PENDING',
        provider auth_provider NOT NULL DEFAULT 'EMAIL',
        national_id VARCHAR(10),
        
        -- Security fields
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        email_verified_at TIMESTAMP,
        phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        phone_verified_at TIMESTAMP,
        phone_verification_attempts INTEGER NOT NULL DEFAULT 0,
        email_verification_attempts INTEGER NOT NULL DEFAULT 0,
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_secret VARCHAR(255),
        login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMP,
        
        -- Timestamps
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        
        -- SAMA compliance
        sama_verified BOOLEAN NOT NULL DEFAULT FALSE,
        sama_verification_date TIMESTAMP,
        risk_category VARCHAR(50)
      );
    `);

    // Add multi-country phone constraint if not exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT check_multi_country_phone 
        CHECK (phone IS NULL OR phone ~ '^\\+966[5][0-9]{8}$' OR phone ~ '^\\+91[6-9][0-9]{9}$' OR phone ~ '^\\+1[2-9][0-9]{9}$');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add national ID constraint if not exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT check_national_id 
        CHECK (national_id = '' OR national_id IS NULL OR national_id ~ '^[12][0-9]{9}$');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Users table created\n');

    // Create indexes
    console.log('🗂️  Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL'
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    console.log('✅ Indexes created\n');

    // Create user sessions table
    console.log('🔑 Creating user sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) UNIQUE NOT NULL,
        device_id VARCHAR(255),
        user_agent TEXT,
        ip_address INET,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT check_session_expiry CHECK (expires_at > created_at)
      );
    `);

    const sessionIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON user_sessions(device_id) WHERE device_id IS NOT NULL'
    ];

    for (const indexSQL of sessionIndexes) {
      await client.query(indexSQL);
    }
    console.log('✅ User sessions table created\n');

    // Create password reset tokens table
    console.log('🔐 Creating password reset tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT check_token_expiry CHECK (expires_at > created_at)
      );
    `);

    const resetIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at ON password_reset_tokens(expires_at)'
    ];

    for (const indexSQL of resetIndexes) {
      await client.query(indexSQL);
    }
    console.log('✅ Password reset tokens table created\n');

    // Create triggers
    console.log('⚡ Creating triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created\n');

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Created tables:');
    console.log('   • users (with multi-country phone support)');
    console.log('   • user_sessions');
    console.log('   • password_reset_tokens');
    console.log('\n🔧 Features enabled:');
    console.log('   • Multi-country phone validation (+966, +91, +1)');
    console.log('   • Optional national ID for non-Saudi users');
    console.log('   • SAMA compliance fields');
    console.log('   • Security and audit features');
    console.log('\n✅ Ready for user registration!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
setupDatabase();