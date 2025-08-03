#!/usr/bin/env node

/**
 * Database Setup Script for RABHAN User Service
 * Creates the necessary tables and structures for user profiles
 */

const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up RABHAN User Service Database');
  console.log('=========================================\n');

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

    // Create enum types
    console.log('📋 Creating enum types...');
    const enums = [
      `CREATE TYPE property_type AS ENUM ('villa', 'apartment', 'duplex', 'townhouse', 'commercial', 'other')`,
      `CREATE TYPE property_ownership AS ENUM ('owned', 'rented', 'leased')`,
      `CREATE TYPE electricity_consumption_range AS ENUM ('0-200', '200-400', '400-600', '600-800', '800-1000', '1000-1200', '1200-1500', '1500+')`,
      `CREATE TYPE preferred_language AS ENUM ('en', 'ar')`
    ];

    for (const enumSQL of enums) {
      try {
        await client.query(enumSQL);
      } catch (error) {
        if (error.code !== '42710') { // Ignore "already exists" errors
          throw error;
        }
      }
    }
    console.log('✅ Enum types created\n');

    // Create user profiles table
    console.log('👤 Creating user profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        
        -- Personal Information
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        
        -- Address Information
        region VARCHAR(50) NOT NULL,
        city VARCHAR(50) NOT NULL,
        district VARCHAR(50) NOT NULL,
        street_address VARCHAR(100) NOT NULL,
        landmark VARCHAR(100),
        postal_code VARCHAR(5) NOT NULL,
        
        -- Property & Energy Information
        property_type property_type NOT NULL,
        property_ownership property_ownership NOT NULL,
        roof_size DECIMAL(10,2) NOT NULL CHECK (roof_size >= 10 AND roof_size <= 10000),
        gps_latitude DECIMAL(10,8) NOT NULL CHECK (gps_latitude >= -90 AND gps_latitude <= 90),
        gps_longitude DECIMAL(11,8) NOT NULL CHECK (gps_longitude >= -180 AND gps_longitude <= 180),
        electricity_consumption electricity_consumption_range NOT NULL,
        electricity_meter_number VARCHAR(20) NOT NULL,
        
        -- Preferences
        preferred_language preferred_language NOT NULL DEFAULT 'ar',
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        sms_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
        
        -- Profile Status
        profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
        profile_completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100),
        
        -- BNPL Eligibility
        bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE,
        bnpl_max_amount DECIMAL(10,2) DEFAULT 0 CHECK (bnpl_max_amount >= 0 AND bnpl_max_amount <= 5000),
        bnpl_risk_score DECIMAL(3,2) CHECK (bnpl_risk_score >= 0 AND bnpl_risk_score <= 1),
        
        -- Timestamps
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add constraints
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE user_profiles ADD CONSTRAINT check_saudi_postal_code 
        CHECK (postal_code ~ '^[0-9]{5}$');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE user_profiles ADD CONSTRAINT check_name_format 
        CHECK (
          first_name ~ '^[a-zA-Z\\u0600-\\u06FF\\s]+$' AND 
          last_name ~ '^[a-zA-Z\\u0600-\\u06FF\\s]+$'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE user_profiles ADD CONSTRAINT check_city_format 
        CHECK (city ~ '^[a-zA-Z\\u0600-\\u06FF\\s]+$');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE user_profiles ADD CONSTRAINT check_meter_number 
        CHECK (electricity_meter_number ~ '^[A-Z0-9]+$');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ User profiles table created\n');

    // Create indexes
    console.log('🗂️  Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_region_city ON user_profiles(region, city)',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_property_type ON user_profiles(property_type)',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_bnpl_eligible ON user_profiles(bnpl_eligible) WHERE bnpl_eligible = TRUE',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC)'
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    console.log('✅ Indexes created\n');

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
      DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
      CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created\n');

    console.log('🎉 User Service database setup completed!');
    console.log('\n📋 Created tables:');
    console.log('   • user_profiles (personal, address, property data)');
    console.log('\n🔧 Features enabled:');
    console.log('   • Multi-language support (Arabic/English)');
    console.log('   • Property and energy information');
    console.log('   • BNPL eligibility tracking');
    console.log('   • Profile completion percentage');
    console.log('\n✅ Ready for user profile creation!');

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