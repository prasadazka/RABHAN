-- Complete AWS Database Schema Fix
-- This adds ALL missing columns that the auth service needs

\c rabhan_auth;

-- Add provider column with enum type
DO $$ 
BEGIN
    -- Create enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
        CREATE TYPE auth_provider AS ENUM ('EMAIL', 'NAFATH');
        RAISE NOTICE 'Created auth_provider enum type';
    END IF;
END $$;

-- Add provider column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'provider') THEN
        ALTER TABLE users ADD COLUMN provider auth_provider NOT NULL DEFAULT 'EMAIL';
        RAISE NOTICE 'Added provider column to users table';
    ELSE
        RAISE NOTICE 'provider column already exists';
    END IF;
END $$;

-- Add user_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'HOMEOWNER';
        RAISE NOTICE 'Added user_type column to users table';
    ELSE
        RAISE NOTICE 'user_type column already exists';
    END IF;
END $$;

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE 'Added first_name column to users table';
    ELSE
        RAISE NOTICE 'first_name column already exists';
    END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE 'Added last_name column to users table';
    ELSE
        RAISE NOTICE 'last_name column already exists';
    END IF;
END $$;

-- Add bnpl_eligible column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'bnpl_eligible') THEN
        ALTER TABLE users ADD COLUMN bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Added bnpl_eligible column to users table';
    ELSE
        RAISE NOTICE 'bnpl_eligible column already exists';
    END IF;
END $$;

-- Show the final table structure
\echo '=== USERS TABLE SCHEMA AFTER FIX ==='
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Complete schema fix applied successfully!' AS status;