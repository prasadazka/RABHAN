-- Create verification tables for email and phone verification
-- SAMA Compliance: CSF 3.3.5 - Identity & Access Management

-- Create verification type enum
CREATE TYPE verification_type AS ENUM ('EMAIL', 'PHONE', 'PASSWORD_RESET');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- Create verification tokens table
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type verification_type NOT NULL,
    token VARCHAR(255) NOT NULL,
    code VARCHAR(6), -- For SMS OTP
    target_value VARCHAR(255) NOT NULL, -- Email address or phone number
    status verification_status NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- SAMA compliance fields
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT check_token_expiry CHECK (expires_at > created_at),
    CONSTRAINT check_code_format CHECK (code ~ '^[0-9]{6}$' OR code IS NULL),
    CONSTRAINT check_attempts CHECK (attempts <= max_attempts)
);

-- Create indexes for verification tokens
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_code ON verification_tokens(code) WHERE code IS NOT NULL;
CREATE INDEX idx_verification_tokens_type ON verification_tokens(verification_type);
CREATE INDEX idx_verification_tokens_status ON verification_tokens(status);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);

-- Create unique constraint to prevent multiple active verifications
CREATE UNIQUE INDEX idx_verification_active_unique 
ON verification_tokens(user_id, verification_type, target_value) 
WHERE status = 'PENDING';

-- Create verification attempts log for SAMA compliance
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_token_id UUID NOT NULL REFERENCES verification_tokens(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_type VARCHAR(50) NOT NULL, -- 'SEND', 'VERIFY', 'RESEND'
    provided_code VARCHAR(6),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- SAMA compliance fields
    compliance_event_id UUID,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Create indexes for verification attempts
CREATE INDEX idx_verification_attempts_token_id ON verification_attempts(verification_token_id);
CREATE INDEX idx_verification_attempts_user_id ON verification_attempts(user_id);
CREATE INDEX idx_verification_attempts_created_at ON verification_attempts(created_at DESC);
CREATE INDEX idx_verification_attempts_success ON verification_attempts(success);
