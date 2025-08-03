-- Update phone_verified status for existing users who have phone numbers
-- Since they already created accounts, we assume their phones were verified during registration

-- Update all users with phone numbers to have phone_verified = true
UPDATE users 
SET 
    phone_verified = true,
    phone_verified_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE 
    phone IS NOT NULL 
    AND phone != ''
    AND phone_verified = false;

-- Add comment to explain the migration
COMMENT ON COLUMN users.phone_verified IS 'Phone verification status. Set to true for all existing users with phone numbers as they were verified during registration';