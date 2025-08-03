-- RABHAN BNPL Platform - Complete Production Database Schema Setup
-- This script creates all tables exactly as they exist in development
-- Run this AFTER creating databases and users

-- =====================================================
-- AUTH DATABASE SCHEMA
-- =====================================================
\c rabhan_auth;

-- Create enum types
CREATE TYPE user_role AS ENUM ('USER', 'CONTRACTOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE auth_provider AS ENUM ('EMAIL', 'NAFATH');
CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED');

-- Create users table with SAMA compliance fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'PENDING',
    provider auth_provider NOT NULL DEFAULT 'EMAIL',
    national_id VARCHAR(10) UNIQUE,
    
    -- User classification
    user_type VARCHAR(50) DEFAULT 'HOMEOWNER',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
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
    
    -- BNPL eligibility
    bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- SAMA compliance
    sama_verified BOOLEAN NOT NULL DEFAULT FALSE,
    sama_verification_date TIMESTAMP,
    risk_category VARCHAR(50),
    
    -- Constraints
    CONSTRAINT check_national_id CHECK (national_id = '' OR national_id IS NULL OR national_id ~ '^[12][0-9]{9}$'),
    CONSTRAINT check_multi_country_phone CHECK (phone IS NULL OR phone ~ '^\+966[5][0-9]{8}$' OR phone ~ '^\+91[6-9][0-9]{9}$' OR phone ~ '^\+1[2-9][0-9]{9}$')
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Create user sessions table
CREATE TABLE user_sessions (
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

-- Create indexes for sessions
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_device_id ON user_sessions(device_id) WHERE device_id IS NOT NULL;

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_token_expiry CHECK (expires_at > created_at)
);

-- Create indexes for password reset tokens
CREATE INDEX idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Phone verification table
CREATE TABLE phone_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_code_format CHECK (code ~ '^[0-9]{6}$'),
    CONSTRAINT check_phone_format CHECK (phone_number ~ '^\+[1-9][0-9]{1,14}$')
);

CREATE INDEX idx_phone_verification_phone ON phone_verification_codes(phone_number);
CREATE INDEX idx_phone_verification_expires ON phone_verification_codes(expires_at);

-- Email verification table  
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_token_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_expires ON email_verification_tokens(expires_at);

-- SAMA compliance audit log table
CREATE TABLE sama_compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    compliance_framework VARCHAR(50),
    compliance_control VARCHAR(50),
    violation_details TEXT
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON sama_compliance_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_event_type ON sama_compliance_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON sama_compliance_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_severity ON sama_compliance_logs(severity);
CREATE INDEX idx_audit_logs_compliance ON sama_compliance_logs(compliance_framework, compliance_control);

-- =====================================================
-- USER DATABASE SCHEMA  
-- =====================================================
\c rabhan_user;

-- Create enum types for user preferences
CREATE TYPE property_type AS ENUM ('villa', 'apartment', 'duplex', 'townhouse', 'commercial', 'other');
CREATE TYPE property_ownership AS ENUM ('owned', 'rented', 'leased');
CREATE TYPE electricity_consumption_range AS ENUM ('0-200', '200-400', '400-600', '600-800', '800-1000', '1000-1200', '1200-1500', '1500+');
CREATE TYPE preferred_language AS ENUM ('en', 'ar');

-- Main user profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users(id)
    
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
    
    -- BNPL Eligibility (Calculated fields)
    bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    bnpl_max_amount DECIMAL(10,2) DEFAULT 0 CHECK (bnpl_max_amount >= 0 AND bnpl_max_amount <= 5000),
    bnpl_risk_score DECIMAL(3,2) CHECK (bnpl_risk_score >= 0 AND bnpl_risk_score <= 1),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_saudi_postal_code CHECK (postal_code ~ '^[0-9]{5}$'),
    CONSTRAINT check_name_format CHECK (
        first_name ~ '^[a-zA-Z\u0600-\u06FF\s]+$' AND 
        last_name ~ '^[a-zA-Z\u0600-\u06FF\s]+$'
    ),
    CONSTRAINT check_city_format CHECK (city ~ '^[a-zA-Z\u0600-\u06FF\s]+$'),
    CONSTRAINT check_meter_number CHECK (electricity_meter_number ~ '^[A-Z0-9]+$')
);

-- Create indexes for performance optimization
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_region_city ON user_profiles(region, city);
CREATE INDEX idx_user_profiles_property_type ON user_profiles(property_type);
CREATE INDEX idx_user_profiles_bnpl_eligible ON user_profiles(bnpl_eligible) WHERE bnpl_eligible = TRUE;
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- User documents table (for KYC tracking)
CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    upload_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_status VARCHAR(20) DEFAULT 'pending',
    uploaded_at TIMESTAMP,
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_documents_user FOREIGN KEY (user_id) 
        REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT check_document_type CHECK (
        document_type IN ('national_id_front', 'national_id_back', 'proof_of_address', 'salary_certificate')
    ),
    CONSTRAINT check_upload_status CHECK (
        upload_status IN ('pending', 'uploaded', 'processing', 'failed')
    ),
    CONSTRAINT check_verification_status CHECK (
        verification_status IN ('pending', 'verified', 'rejected', 'expired')
    )
);

CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX idx_user_documents_status ON user_documents(verification_status) WHERE verification_status != 'verified';

-- =====================================================
-- DOCUMENTS DATABASE SCHEMA
-- =====================================================
\c rabhan_documents;

-- Create enum types
CREATE TYPE document_status AS ENUM ('pending', 'uploaded', 'processing', 'verified', 'rejected', 'expired');
CREATE TYPE document_category AS ENUM ('identity', 'address', 'income', 'property');

-- Main documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL,
    document_category document_category NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    file_type VARCHAR(50) NOT NULL,
    file_hash VARCHAR(256) NOT NULL UNIQUE,
    
    -- Status and Processing
    status document_status NOT NULL DEFAULT 'pending',
    upload_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_status VARCHAR(20) DEFAULT 'pending',
    
    -- Verification Results
    verification_score DECIMAL(3,2) CHECK (verification_score >= 0 AND verification_score <= 1),
    verification_details JSONB DEFAULT '{}',
    rejection_reason TEXT,
    verified_by UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    encryption_key_id VARCHAR(255),
    content_preview TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_file_types CHECK (
        file_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/jpg')
    ),
    CONSTRAINT check_file_size CHECK (file_size <= 52428800), -- 50MB max
    CONSTRAINT check_verification_timeline CHECK (
        processed_at IS NULL OR processed_at >= uploaded_at
    )
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Document processing queue
CREATE TABLE document_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Processing Details
    processor_id VARCHAR(255),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_processing_status CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT check_priority_range CHECK (priority >= 1 AND priority <= 10)
);

CREATE INDEX idx_processing_queue_status ON document_processing_queue(status, priority, created_at);
CREATE INDEX idx_processing_queue_document ON document_processing_queue(document_id);

-- =====================================================
-- CONTRACTORS DATABASE SCHEMA
-- =====================================================
\c rabhan_contractors;

-- Create enum types
CREATE TYPE contractor_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE contractor_type AS ENUM ('individual', 'company');
CREATE TYPE service_category AS ENUM ('solar_installation', 'maintenance', 'consultation');

-- Main contractors table
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users(id)
    
    -- Business Information
    business_name VARCHAR(100) NOT NULL,
    business_type contractor_type NOT NULL,
    commercial_registration VARCHAR(20) UNIQUE,
    vat_number VARCHAR(20),
    
    -- Contact Information
    contact_person_name VARCHAR(100) NOT NULL,
    business_phone VARCHAR(20) NOT NULL,
    business_email VARCHAR(255) NOT NULL,
    
    -- Address Information
    business_address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    postal_code VARCHAR(5) NOT NULL,
    
    -- Service Information
    service_categories service_category[] NOT NULL DEFAULT '{}',
    service_areas TEXT[] NOT NULL DEFAULT '{}', -- Array of cities/regions
    max_project_value DECIMAL(12,2) DEFAULT 0,
    
    -- Status and Verification
    status contractor_status NOT NULL DEFAULT 'pending',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP,
    verification_notes TEXT,
    
    -- Performance Metrics
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    total_projects INTEGER NOT NULL DEFAULT 0,
    completed_projects INTEGER NOT NULL DEFAULT 0,
    cancelled_projects INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_saudi_postal_code CHECK (postal_code ~ '^[0-9]{5}$'),
    CONSTRAINT check_business_phone CHECK (business_phone ~ '^\+966[1-9][0-9]{8}$'),
    CONSTRAINT check_cr_format CHECK (
        commercial_registration IS NULL OR 
        commercial_registration ~ '^[0-9]{10}$'
    ),
    CONSTRAINT check_vat_format CHECK (
        vat_number IS NULL OR 
        vat_number ~ '^[0-9]{15}$'
    )
);

-- Create indexes
CREATE INDEX idx_contractors_user_id ON contractors(user_id);
CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_contractors_city ON contractors(city);
CREATE INDEX idx_contractors_region ON contractors(region);
CREATE INDEX idx_contractors_verified ON contractors(verified);
CREATE INDEX idx_contractors_rating ON contractors(rating DESC) WHERE rating IS NOT NULL;

-- =====================================================
-- SHARED FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger function (shared across all databases)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to each database
\c rabhan_auth;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

\c rabhan_user;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

\c rabhan_documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at BEFORE UPDATE ON document_processing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

\c rabhan_contractors;
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
\c postgres;
SELECT 'RABHAN Database Schema Setup Completed Successfully!' AS status;