-- Migration: Transform Auth Service to Contractor-Only Authentication
-- Date: 2025-08-01
-- Description: Remove all user-related tables and transform contractors table for standalone authentication

-- This migration documents the transformation performed to remove the users table
-- and all related tables, keeping only contractors for authentication

-- WARNING: This migration represents destructive changes that were already applied
-- The following tables were DROPPED:
-- - users
-- - user_sessions  
-- - password_reset_tokens
-- - sama_compliance_logs
-- - sama_compliance_logs_y2025m01
-- - verification_attempts
-- - verification_tokens

-- The following enums were DROPPED:
-- - user_role
-- - auth_provider
-- - user_status

-- The following functions were DROPPED:
-- - check_user_bnpl_eligibility(UUID)

-- CONTRACTORS TABLE TRANSFORMATION:
-- Added authentication fields to contractors table:
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS national_id VARCHAR(10);

-- Added verification fields:
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;

-- Added security fields:
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Added compliance fields:
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS sama_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS sama_verification_date TIMESTAMP;

-- Set NOT NULL constraints:
UPDATE contractors SET email_verified = FALSE WHERE email_verified IS NULL;
ALTER TABLE contractors ALTER COLUMN email_verified SET NOT NULL;

UPDATE contractors SET phone_verified = FALSE WHERE phone_verified IS NULL;
ALTER TABLE contractors ALTER COLUMN phone_verified SET NOT NULL;

UPDATE contractors SET status = 'PENDING' WHERE status IS NULL;
ALTER TABLE contractors ALTER COLUMN status SET NOT NULL;

UPDATE contractors SET login_attempts = 0 WHERE login_attempts IS NULL;
ALTER TABLE contractors ALTER COLUMN login_attempts SET NOT NULL;

UPDATE contractors SET sama_verified = FALSE WHERE sama_verified IS NULL;
ALTER TABLE contractors ALTER COLUMN sama_verified SET NOT NULL;

-- Remove user_id column (was FK to users table):
ALTER TABLE contractors DROP COLUMN IF EXISTS user_id;

-- Add unique constraints:
ALTER TABLE contractors ADD CONSTRAINT IF NOT EXISTS contractors_email_unique UNIQUE (email);
ALTER TABLE contractors ADD CONSTRAINT IF NOT EXISTS contractors_national_id_unique UNIQUE (national_id);

-- Add check constraints:
ALTER TABLE contractors ADD CONSTRAINT IF NOT EXISTS check_contractor_status 
CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED'));

-- Create indexes:
CREATE INDEX IF NOT EXISTS idx_contractors_email ON contractors(email);
CREATE INDEX IF NOT EXISTS idx_contractors_phone ON contractors(phone);
CREATE INDEX IF NOT EXISTS idx_contractors_national_id ON contractors(national_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);

-- CREATE CONTRACTOR SESSIONS TABLE:
CREATE TABLE IF NOT EXISTS contractor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_contractor_session_expiry CHECK (expires_at > created_at)
);

-- Create session indexes:
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_contractor_id ON contractor_sessions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_refresh_token ON contractor_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_contractor_sessions_expires_at ON contractor_sessions(expires_at);

-- Recreate update function:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to contractors table:
DROP TRIGGER IF EXISTS update_contractors_updated_at ON contractors;
CREATE TRIGGER update_contractors_updated_at 
BEFORE UPDATE ON contractors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION COMPLETE
-- The auth service now only supports contractor authentication
-- All user-related tables and functionality have been removed