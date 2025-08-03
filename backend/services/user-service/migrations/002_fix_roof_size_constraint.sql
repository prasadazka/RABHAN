-- Fix roof size constraint to allow more realistic values
-- Current constraint requires roof_size >= 10, which is too restrictive for profile creation

-- Drop the existing constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_roof_size_check;

-- Add new constraint allowing 0 (for incomplete profiles) up to 10000
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_roof_size_check 
CHECK (roof_size >= 0 AND roof_size <= 10000);

-- Update any existing profiles with invalid roof sizes to default value
UPDATE user_profiles 
SET roof_size = 50 
WHERE roof_size < 0 OR roof_size > 10000;

-- Comment
COMMENT ON CONSTRAINT user_profiles_roof_size_check ON user_profiles 
IS 'Roof size in square meters: 0 (incomplete) to 10000 sqm maximum';