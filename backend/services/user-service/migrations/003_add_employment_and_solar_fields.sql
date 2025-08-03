-- Migration to add missing employment and solar preference fields
-- Author: Claude Code Assistant
-- Date: 2025-07-31

-- Add employment status enum type
CREATE TYPE employment_status AS ENUM ('government', 'private', 'self_employed', 'student', 'retired');

-- Add employment and solar preference fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN employment_status employment_status,
ADD COLUMN employer_name VARCHAR(100),
ADD COLUMN job_title VARCHAR(100),
ADD COLUMN monthly_income DECIMAL(10,2),
ADD COLUMN years_employed INTEGER,
ADD COLUMN desired_system_size DECIMAL(10,2),
ADD COLUMN budget_range VARCHAR(50);

-- Add constraints for the new fields
ALTER TABLE user_profiles 
ADD CONSTRAINT check_monthly_income CHECK (monthly_income >= 0 AND monthly_income <= 1000000),
ADD CONSTRAINT check_years_employed CHECK (years_employed >= 0 AND years_employed <= 50),
ADD CONSTRAINT check_desired_system_size CHECK (desired_system_size >= 1 AND desired_system_size <= 100),
ADD CONSTRAINT check_budget_range CHECK (budget_range IN ('under_10k', '10k_25k', '25k_50k', '50k_100k', 'over_100k'));

-- Add indexes for employment fields (useful for BNPL eligibility queries)
CREATE INDEX idx_user_profiles_employment_status ON user_profiles(employment_status) WHERE employment_status IS NOT NULL;
CREATE INDEX idx_user_profiles_monthly_income ON user_profiles(monthly_income) WHERE monthly_income IS NOT NULL;

-- Update the profile completion calculation function to include employment status
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
    
    -- Basic personal fields (10%)
    IF v_profile.first_name IS NOT NULL AND v_profile.last_name IS NOT NULL THEN
        v_completion := v_completion + 10;
    END IF;
    
    -- Address fields (15%)
    IF v_profile.street_address IS NOT NULL AND v_profile.city IS NOT NULL 
       AND v_profile.postal_code IS NOT NULL THEN
        v_completion := v_completion + 15;
    END IF;
    
    -- Property fields (15%)
    IF v_profile.property_type IS NOT NULL AND v_profile.roof_size IS NOT NULL THEN
        v_completion := v_completion + 15;
    END IF;
    
    -- Energy fields (15%)
    IF v_profile.electricity_consumption IS NOT NULL AND v_profile.electricity_meter_number IS NOT NULL THEN
        v_completion := v_completion + 15;
    END IF;
    
    -- GPS coordinates (5%)  
    IF v_profile.gps_latitude IS NOT NULL AND v_profile.gps_longitude IS NOT NULL THEN
        v_completion := v_completion + 5;
    END IF;
    
    -- Employment status (10%) - Required for BNPL eligibility
    IF v_profile.employment_status IS NOT NULL THEN
        v_completion := v_completion + 10;
    END IF;
    
    -- Optional employment details (5%)
    IF v_profile.employer_name IS NOT NULL AND v_profile.job_title IS NOT NULL THEN
        v_completion := v_completion + 5;
    END IF;
    
    -- Optional solar preferences (5%)
    IF v_profile.desired_system_size IS NOT NULL AND v_profile.budget_range IS NOT NULL THEN
        v_completion := v_completion + 5;
    END IF;
    
    -- Documents verification (20%) - Required for 100% completion
    SELECT COUNT(*) INTO v_documents_count 
    FROM user_documents 
    WHERE user_id = p_user_id AND verification_status = 'verified';
    
    -- Require at least 2 verified documents for the full 20%
    IF v_documents_count >= 3 THEN
        v_completion := v_completion + 20;
    ELSIF v_documents_count = 2 THEN
        v_completion := v_completion + 15;
    ELSIF v_documents_count = 1 THEN
        v_completion := v_completion + 10;
    END IF;
    
    -- Without verified documents, max completion is 80%
    IF v_documents_count = 0 THEN
        v_completion := LEAST(v_completion, 80);
    END IF;
    
    RETURN LEAST(v_completion, 100);
END;
$$ LANGUAGE plpgsql;

-- Update BNPL eligibility function to consider employment status
CREATE OR REPLACE FUNCTION check_user_bnpl_eligibility(p_user_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    max_amount DECIMAL(10,2),
    risk_score DECIMAL(3,2),
    reason TEXT
) AS $$
DECLARE
    v_profile RECORD;
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
    
    -- Check profile completion (must be at least 80% including employment)
    IF v_profile.profile_completion_percentage < 80 THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), v_risk_score, 'Profile incomplete - need employment status'::TEXT;
        RETURN;
    END IF;
    
    -- Employment status is required for BNPL
    IF v_profile.employment_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), v_risk_score, 'Employment status required'::TEXT;
        RETURN;
    END IF;
    
    -- Check document verification (at least 2 verified documents required)
    SELECT COUNT(*) INTO v_documents_verified
    FROM user_documents
    WHERE user_id = p_user_id AND verification_status = 'verified';
    
    IF v_documents_verified < 2 THEN
        RETURN QUERY SELECT FALSE, 0.00::DECIMAL(10,2), v_risk_score, 'Insufficient verified documents'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate risk score based on employment status
    CASE v_profile.employment_status
        WHEN 'government' THEN v_risk_score := v_risk_score - 0.2;
        WHEN 'private' THEN v_risk_score := v_risk_score - 0.1;
        WHEN 'self_employed' THEN v_risk_score := v_risk_score + 0.1;
        WHEN 'retired' THEN v_risk_score := v_risk_score + 0.05;
        WHEN 'student' THEN v_risk_score := v_risk_score + 0.3;
        ELSE v_risk_score := v_risk_score;
    END CASE;
    
    -- Adjust based on property ownership
    IF v_profile.property_ownership = 'owned' THEN
        v_risk_score := v_risk_score - 0.15;
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
    
    -- Adjust based on monthly income if provided
    IF v_profile.monthly_income IS NOT NULL THEN
        IF v_profile.monthly_income >= 15000 THEN
            v_risk_score := v_risk_score - 0.2;
        ELSIF v_profile.monthly_income >= 10000 THEN
            v_risk_score := v_risk_score - 0.1;
        ELSIF v_profile.monthly_income < 5000 THEN
            v_risk_score := v_risk_score + 0.2;
        END IF;
    END IF;
    
    -- Ensure risk score stays within bounds
    v_risk_score := GREATEST(0.1, LEAST(1.0, v_risk_score));
    
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

-- Add comments for new fields
COMMENT ON COLUMN user_profiles.employment_status IS 'Employment status required for BNPL eligibility assessment';
COMMENT ON COLUMN user_profiles.employer_name IS 'Optional employer name for enhanced credit assessment';
COMMENT ON COLUMN user_profiles.job_title IS 'Optional job title for enhanced credit assessment';
COMMENT ON COLUMN user_profiles.monthly_income IS 'Optional monthly income for enhanced credit assessment';
COMMENT ON COLUMN user_profiles.years_employed IS 'Optional years employed for enhanced credit assessment';
COMMENT ON COLUMN user_profiles.desired_system_size IS 'Optional desired solar system size in kW for recommendation engine';
COMMENT ON COLUMN user_profiles.budget_range IS 'Optional budget range for solar installation for recommendation engine';