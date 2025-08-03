-- User Service Database Schema
-- SAMA Compliant User Profile Management

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
    roof_size DECIMAL(10,2) NOT NULL CHECK (roof_size >= 10 AND roof_size <= 10000), -- Square meters
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

-- Spatial index for GPS coordinates (contractor matching)
CREATE INDEX idx_user_profiles_location ON user_profiles USING GIST (
    point(gps_longitude, gps_latitude)
);

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

-- User activity tracking table
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_activities_user FOREIGN KEY (user_id) 
        REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);

-- SAMA compliance audit log table
CREATE TABLE user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    performed_by UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- SAMA compliance fields
    compliance_framework VARCHAR(50),
    compliance_control VARCHAR(50),
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON user_audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_event_type ON user_audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON user_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_compliance ON user_audit_logs(compliance_framework, compliance_control);

-- Create partitioning for audit logs (SAMA 7-year retention)
CREATE TABLE user_audit_logs_y2025m01 PARTITION OF user_audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_completion INTEGER := 0;
    v_profile RECORD;
    v_documents_count INTEGER;
BEGIN
    -- Get profile data
    SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Basic fields (60%)
    IF v_profile.first_name IS NOT NULL AND v_profile.last_name IS NOT NULL THEN
        v_completion := v_completion + 10;
    END IF;
    
    -- Address fields (20%)
    IF v_profile.street_address IS NOT NULL AND v_profile.city IS NOT NULL 
       AND v_profile.postal_code IS NOT NULL THEN
        v_completion := v_completion + 20;
    END IF;
    
    -- Property fields (20%)
    IF v_profile.property_type IS NOT NULL AND v_profile.roof_size IS NOT NULL THEN
        v_completion := v_completion + 20;
    END IF;
    
    -- Energy fields (20%)
    IF v_profile.electricity_consumption IS NOT NULL AND v_profile.electricity_meter_number IS NOT NULL THEN
        v_completion := v_completion + 20;
    END IF;
    
    -- GPS coordinates (10%)
    IF v_profile.gps_latitude IS NOT NULL AND v_profile.gps_longitude IS NOT NULL THEN
        v_completion := v_completion + 10;
    END IF;
    
    -- Documents (20%)
    SELECT COUNT(*) INTO v_documents_count 
    FROM user_documents 
    WHERE user_id = p_user_id AND verification_status = 'verified';
    
    IF v_documents_count >= 2 THEN
        v_completion := v_completion + 20;
    ELSIF v_documents_count = 1 THEN
        v_completion := v_completion + 10;
    END IF;
    
    RETURN LEAST(v_completion, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to check BNPL eligibility
CREATE OR REPLACE FUNCTION check_user_bnpl_eligibility(p_user_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    max_amount DECIMAL(10,2),
    risk_score DECIMAL(3,2),
    reason TEXT
) AS $$
DECLARE
    v_profile RECORD;
    v_auth_verified BOOLEAN;
    v_documents_verified INTEGER;
    v_risk_score DECIMAL(3,2) := 0.5;
    v_max_amount DECIMAL(10,2) := 0;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), 0.00::DECIMAL(3,2), 'User profile not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check profile completion
    IF v_profile.profile_completion_percentage < 80 THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), v_risk_score, 'Profile incomplete'::TEXT;
        RETURN;
    END IF;
    
    -- Check document verification
    SELECT COUNT(*) INTO v_documents_verified
    FROM user_documents
    WHERE user_id = p_user_id AND verification_status = 'verified';
    
    IF v_documents_verified < 2 THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), v_risk_score, 'Documents not verified'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate risk score based on property ownership
    IF v_profile.property_ownership = 'owned' THEN
        v_risk_score := v_risk_score - 0.2;
    ELSIF v_profile.property_ownership = 'rented' THEN
        v_risk_score := v_risk_score + 0.1;
    END IF;
    
    -- Adjust based on electricity consumption (proxy for income)
    CASE v_profile.electricity_consumption
        WHEN '1200-1500' THEN v_risk_score := v_risk_score - 0.1;
        WHEN '1500+' THEN v_risk_score := v_risk_score - 0.15;
        WHEN '0-200' THEN v_risk_score := v_risk_score + 0.1;
        ELSE v_risk_score := v_risk_score;
    END CASE;
    
    -- Calculate max amount based on risk score
    IF v_risk_score <= 0.3 THEN
        v_max_amount := 5000;
    ELSIF v_risk_score <= 0.5 THEN
        v_max_amount := 4000;
    ELSIF v_risk_score <= 0.7 THEN
        v_max_amount := 3000;
    ELSE
        v_max_amount := 2000;
    END IF;
    
    RETURN QUERY SELECT 
        TRUE, 
        v_max_amount, 
        v_risk_score, 
        'Eligible for BNPL'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for user statistics (SAMA reporting)
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    region,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE profile_completed = TRUE) as completed_profiles,
    COUNT(*) FILTER (WHERE bnpl_eligible = TRUE) as eligible_users,
    AVG(profile_completion_percentage) as avg_completion,
    AVG(bnpl_max_amount) FILTER (WHERE bnpl_eligible = TRUE) as avg_bnpl_amount
FROM user_profiles
GROUP BY DATE_TRUNC('month', created_at), region;

CREATE UNIQUE INDEX ON user_statistics (month, region);

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Main user profile table storing personal, address, property, and preference information';
COMMENT ON TABLE user_documents IS 'KYC document tracking for user verification';
COMMENT ON TABLE user_activities IS 'User activity tracking for analytics and security';
COMMENT ON TABLE user_audit_logs IS 'SAMA compliant audit trail for all user data modifications';
COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates user profile completion percentage for UX and eligibility';
COMMENT ON FUNCTION check_user_bnpl_eligibility IS 'Determines BNPL eligibility based on profile and verification status';