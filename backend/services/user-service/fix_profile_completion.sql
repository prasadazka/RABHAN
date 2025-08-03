-- Create missing profile completion function
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_completion INTEGER := 0;
    v_profile RECORD;
BEGIN
    -- Get profile data using auth_user_id (correct column name)
    SELECT * INTO v_profile FROM user_profiles WHERE auth_user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Property information (25%)
    IF v_profile.property_type IS NOT NULL AND v_profile.property_ownership IS NOT NULL THEN
        v_completion := v_completion + 25;
    END IF;
    
    -- Roof size (25%)
    IF v_profile.roof_size IS NOT NULL AND v_profile.roof_size > 0 THEN
        v_completion := v_completion + 25;
    END IF;
    
    -- Electricity consumption (25%)
    IF v_profile.electricity_consumption IS NOT NULL THEN
        v_completion := v_completion + 25;
    END IF;
    
    -- Electricity meter number (25%)
    IF v_profile.electricity_meter_number IS NOT NULL THEN
        v_completion := v_completion + 25;
    END IF;
    
    RETURN LEAST(v_completion, 100);
END;
$$ LANGUAGE plpgsql;