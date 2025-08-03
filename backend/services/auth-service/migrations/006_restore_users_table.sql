-- Restore Users Table for Auth Service
-- This migration restores the users table alongside the existing contractors table
-- for proper user/contractor separation

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'CONTRACTOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('EMAIL', 'NAFATH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    
    -- BNPL eligibility
    bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    
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
    
    -- Constraints
    CONSTRAINT check_session_expiry CHECK (expires_at > created_at)
);

-- Create indexes for sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_device_id ON user_sessions(device_id) WHERE device_id IS NOT NULL;

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_token_expiry CHECK (expires_at > created_at)
);

-- Create indexes for password reset tokens
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Create SAMA compliance audit log table for users (partitioned by timestamp)
CREATE TABLE user_compliance_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Compliance fields
    compliance_framework VARCHAR(50),
    compliance_control VARCHAR(50),
    violation_details TEXT,
    
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for user audit logs (monthly partitions)
-- This is for SAMA 7-year retention requirement
CREATE TABLE user_compliance_logs_y2025m01 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_compliance_logs_y2025m02 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE user_compliance_logs_y2025m03 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE user_compliance_logs_y2025m04 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE user_compliance_logs_y2025m05 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE user_compliance_logs_y2025m06 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE user_compliance_logs_y2025m07 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE user_compliance_logs_y2025m08 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE user_compliance_logs_y2025m09 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE user_compliance_logs_y2025m10 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE user_compliance_logs_y2025m11 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE user_compliance_logs_y2025m12 PARTITION OF user_compliance_logs
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Create indexes for user audit logs on the main table
CREATE INDEX idx_user_compliance_logs_user_id ON user_compliance_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_compliance_logs_event_type ON user_compliance_logs(event_type);
CREATE INDEX idx_user_compliance_logs_timestamp ON user_compliance_logs(timestamp DESC);
CREATE INDEX idx_user_compliance_logs_severity ON user_compliance_logs(severity);
CREATE INDEX idx_user_compliance_logs_compliance ON user_compliance_logs(compliance_framework, compliance_control);

-- Apply update timestamp trigger to users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check user eligibility (SAMA BNPL rules)
CREATE OR REPLACE FUNCTION check_user_bnpl_eligibility(p_user_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    reason TEXT,
    current_exposure DECIMAL(10,2)
) AS $$
DECLARE
    v_user_record RECORD;
    v_current_exposure DECIMAL(10,2);
BEGIN
    -- Get user details
    SELECT * INTO v_user_record FROM users WHERE id = p_user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found', 0.00::DECIMAL(10,2);
        RETURN;
    END IF;
    
    -- Check if user is Saudi resident (national ID starts with 1 or 2) - only for production BNPL
    -- For development/testing, allow non-Saudi users
    IF v_user_record.national_id IS NOT NULL AND v_user_record.national_id != '' AND NOT (v_user_record.national_id ~ '^[12][0-9]{9}$') THEN
        RETURN QUERY SELECT FALSE, 'BNPL services are only available to Saudi residents', 0.00::DECIMAL(10,2);
        RETURN;
    END IF;
    
    -- Check if user is verified
    IF NOT v_user_record.sama_verified THEN
        RETURN QUERY SELECT FALSE, 'User verification required', 0.00::DECIMAL(10,2);
        RETURN;
    END IF;
    
    -- Check user status
    IF v_user_record.status != 'ACTIVE' THEN
        RETURN QUERY SELECT FALSE, 'User account is not active', 0.00::DECIMAL(10,2);
        RETURN;
    END IF;
    
    -- Calculate current BNPL exposure (will be implemented when transaction table is created)
    v_current_exposure := 0.00;
    
    RETURN QUERY SELECT TRUE, 'Eligible', v_current_exposure;
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure role consistency between users and contractors
CREATE OR REPLACE FUNCTION enforce_role_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a user with CONTRACTOR role, ensure contractor record exists
    IF NEW.role = 'CONTRACTOR' THEN
        -- Check if contractor record exists
        IF NOT EXISTS (SELECT 1 FROM contractors WHERE id = NEW.id) THEN
            -- Insert basic contractor record
            INSERT INTO contractors (id, company_name, first_name, last_name, email, phone, national_id)
            VALUES (
                NEW.id,
                COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Contractor Business'),
                NEW.first_name,
                NEW.last_name,
                NEW.email,
                NEW.phone,
                NEW.national_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain role consistency
CREATE TRIGGER ensure_user_contractor_consistency
    AFTER INSERT OR UPDATE OF role ON users
    FOR EACH ROW
    WHEN (NEW.role = 'CONTRACTOR')
    EXECUTE FUNCTION enforce_role_consistency();

-- Add comment to tables for documentation
COMMENT ON TABLE users IS 'Primary user authentication table for regular users (role=USER)';
COMMENT ON TABLE user_sessions IS 'Session management for user authentication';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens for users';
COMMENT ON TABLE user_compliance_logs IS 'SAMA compliance audit logs for user activities';

-- Grant necessary permissions (adjust as needed for your deployment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO auth_service_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO auth_service_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO auth_service_user;
-- GRANT SELECT, INSERT ON user_compliance_logs TO auth_service_user;