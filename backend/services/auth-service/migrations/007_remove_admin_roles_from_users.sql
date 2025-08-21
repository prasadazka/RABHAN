-- Remove Admin Roles from Users Table
-- Clean separation: Users = Customers, Contractors = Business, Admins = Separate System
-- This ensures no mixing of customer/contractor data with admin data

-- Update user_role enum to remove admin roles
-- First create new enum without admin roles
CREATE TYPE user_role_new AS ENUM ('USER', 'CONTRACTOR');

-- Update existing users table to use new enum
-- First, ensure no admin users exist in users table (they should be in admin service)
DELETE FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN');

-- Update column to use new enum
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';

-- Drop old enum and rename new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Add constraint to ensure users table only has USER/CONTRACTOR
ALTER TABLE users ADD CONSTRAINT check_user_role_no_admin 
CHECK (role IN ('USER', 'CONTRACTOR'));

-- Update comments for clarity
COMMENT ON TABLE users IS 'Customer authentication table - homeowners who buy solar systems (role=USER only)';
COMMENT ON TABLE contractors IS 'Contractor authentication table - solar installation companies (referenced from users with role=CONTRACTOR)';

-- Log the cleanup
INSERT INTO user_compliance_logs (
    user_id, 
    event_type, 
    event_data, 
    severity, 
    compliance_framework
) VALUES (
    NULL,
    'ADMIN_ROLE_CLEANUP',
    '{"action": "removed_admin_roles_from_users_table", "reason": "clean_separation_of_concerns"}',
    'MEDIUM',
    'RABHAN_DATA_SEPARATION'
);

-- Success message
SELECT 
    'Auth Service Cleaned: Admin roles removed from users table' as status,
    'Users = Customers | Contractors = Business | Admins = Separate Service' as separation,
    'No more mixing of user types' as compliance;