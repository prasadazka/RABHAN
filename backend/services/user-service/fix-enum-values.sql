-- Fix employment_status enum values to match TypeScript
-- Drop and recreate the enum with correct values

-- First, alter the column to use text temporarily
ALTER TABLE user_profiles ALTER COLUMN employment_status TYPE TEXT;

-- Drop the old enum
DROP TYPE IF EXISTS employment_status;

-- Create new enum with correct values
CREATE TYPE employment_status AS ENUM ('government', 'private', 'selfEmployed', 'student', 'retired');

-- Convert the column back to the enum type
ALTER TABLE user_profiles ALTER COLUMN employment_status TYPE employment_status USING employment_status::employment_status;