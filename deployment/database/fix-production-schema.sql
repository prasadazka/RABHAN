-- Fix Production Database Schema - Add Missing Columns
-- Run this on AWS to fix existing tables without recreating them

-- =====================================================
-- AUTH DATABASE - Add missing columns to users table
-- =====================================================
\c rabhan_auth;

-- Add user_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'HOMEOWNER';
        RAISE NOTICE 'Added user_type column to users table';
    ELSE
        RAISE NOTICE 'user_type column already exists';
    END IF;
END $$;

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE 'Added first_name column to users table';
    ELSE
        RAISE NOTICE 'first_name column already exists';
    END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE 'Added last_name column to users table';
    ELSE
        RAISE NOTICE 'last_name column already exists';
    END IF;
END $$;

-- Add bnpl_eligible column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'bnpl_eligible') THEN
        ALTER TABLE users ADD COLUMN bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added bnpl_eligible column to users table';
    ELSE
        RAISE NOTICE 'bnpl_eligible column already exists';
    END IF;
END $$;

-- Check if phone verification tables exist, if not create them
CREATE TABLE IF NOT EXISTS phone_verification_codes (
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

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_phone_verification_phone') THEN
        CREATE INDEX idx_phone_verification_phone ON phone_verification_codes(phone_number);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_phone_verification_expires') THEN
        CREATE INDEX idx_phone_verification_expires ON phone_verification_codes(expires_at);
    END IF;
END $$;

-- Check if email verification tables exist, if not create them
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_token_expiry CHECK (expires_at > created_at)
);

-- Create email verification indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_token') THEN
        CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_user') THEN
        CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_expires') THEN
        CREATE INDEX idx_email_verification_expires ON email_verification_tokens(expires_at);
    END IF;
END $$;

-- =====================================================
-- Verify and show current schema
-- =====================================================
\echo '=== AUTH DATABASE SCHEMA STATUS ==='
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

\echo '=== VERIFICATION TABLES STATUS ==='
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('phone_verification_codes', 'email_verification_tokens')
AND table_schema = 'public';

SELECT 'Production database schema fix completed successfully!' AS status;