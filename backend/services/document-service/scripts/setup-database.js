#!/usr/bin/env node

/**
 * Database Setup Script for RABHAN Document Service
 * Creates the necessary tables and structures for document management
 */

const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up RABHAN Document Service Database');
  console.log('============================================\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_document',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled\n');

    // Create enum types
    console.log('📋 Creating enum types...');
    const enums = [
      `CREATE TYPE document_status AS ENUM ('pending', 'processing', 'validated', 'approved', 'rejected', 'expired', 'archived')`,
      `CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'under_review')`,
      `CREATE TYPE storage_provider AS ENUM ('minio', 's3', 'local')`
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

    // Create document categories table
    console.log('📂 Creating document categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        required_for_role VARCHAR(50) NOT NULL CHECK (required_for_role IN ('customer', 'contractor', 'both')),
        max_file_size_mb INTEGER DEFAULT 10 CHECK (max_file_size_mb > 0 AND max_file_size_mb <= 50),
        allowed_formats TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
        retention_years INTEGER DEFAULT 7 CHECK (retention_years >= 1),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Document categories table created\n');

    // Create main documents table
    console.log('📄 Creating documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        category_id UUID NOT NULL REFERENCES document_categories(id),
        
        -- Document metadata
        original_filename VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64) NOT NULL,
        file_extension VARCHAR(10) NOT NULL,
        
        -- Storage information
        storage_provider storage_provider NOT NULL DEFAULT 'local',
        storage_bucket VARCHAR(100) NOT NULL DEFAULT 'documents',
        storage_path VARCHAR(500) NOT NULL,
        storage_region VARCHAR(50) DEFAULT 'ksa-central',
        encryption_key_id VARCHAR(100),
        encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
        
        -- Document status
        status document_status NOT NULL DEFAULT 'pending',
        upload_ip_address INET,
        upload_user_agent TEXT,
        upload_session_id VARCHAR(100),
        
        -- Validation results
        validation_results JSONB DEFAULT '{}',
        validation_score DECIMAL(5,2) DEFAULT 0.0 CHECK (validation_score >= 0.0 AND validation_score <= 100.0),
        validation_completed_at TIMESTAMP WITH TIME ZONE,
        validation_errors TEXT[],
        
        -- Approval workflow
        approval_status approval_status DEFAULT 'pending',
        approved_by UUID,
        approved_at TIMESTAMP WITH TIME ZONE,
        approval_notes TEXT,
        rejection_reason TEXT,
        
        -- Document lifecycle
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        archived_at TIMESTAMP WITH TIME ZONE,
        
        -- SAMA compliance
        sama_audit_log JSONB NOT NULL DEFAULT '[]',
        access_log JSONB NOT NULL DEFAULT '[]',
        compliance_flags JSONB DEFAULT '{}',
        
        -- Security
        virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'scanning', 'clean', 'infected', 'suspicious', 'error')),
        virus_scan_completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Add constraints
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE documents ADD CONSTRAINT unique_file_hash UNIQUE (file_hash);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE documents ADD CONSTRAINT check_file_size CHECK (file_size_bytes <= 52428800);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Documents table created\n');

    // Create indexes
    console.log('🗂️  Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_documents_user_id_status ON documents(user_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_category_id_created_at ON documents(category_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status) WHERE approval_status = \'pending\'',
      'CREATE INDEX IF NOT EXISTS idx_documents_status_created_at ON documents(status, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash)',
      'CREATE INDEX IF NOT EXISTS idx_document_categories_role ON document_categories(required_for_role)'
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
      DROP TRIGGER IF EXISTS update_document_categories_updated_at ON document_categories;
      CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
      CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created\n');

    // Insert default document categories
    console.log('📁 Creating default document categories...');
    await client.query(`
      INSERT INTO document_categories (name, description, required_for_role, max_file_size_mb, allowed_formats) VALUES
      -- MVP Phase 1 - User KYC Requirements
      ('national_id_front', 'Saudi National ID (Front Side)', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
      ('national_id_back', 'Saudi National ID (Back Side)', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
      ('proof_of_address', 'Proof of address document', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
      -- Beta Phase - Additional User Documents
      ('salary_certificate', 'Salary certificate from employer', 'customer', 10, ARRAY['pdf']),
      ('bank_statement', 'Bank statement (last 3 months)', 'customer', 10, ARRAY['pdf']),
      -- Contractor Requirements
      ('commercial_registration', 'Commercial Registration Certificate', 'contractor', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
      ('insurance_certificate', 'Professional Insurance Certificate', 'contractor', 10, ARRAY['pdf'])
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Default document categories created\n');

    console.log('🎉 Document Service database setup completed!');
    console.log('\n📋 Created tables:');
    console.log('   • document_categories (KYC document types)');
    console.log('   • documents (file metadata and status)');
    console.log('\n🔧 Features enabled:');
    console.log('   • File upload and validation');
    console.log('   • Document categorization');
    console.log('   • Approval workflow support');
    console.log('   • SAMA compliance logging');
    console.log('   • Virus scanning integration');
    console.log('\n✅ Ready for document uploads!');

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