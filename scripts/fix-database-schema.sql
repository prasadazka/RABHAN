-- Quick fix for database schema mismatch
-- Run this on your local database if columns are missing

-- Connect to auth database and add missing columns if they don't exist
\c rabhan_auth;

-- Add user_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'HOMEOWNER';
    END IF;
END $$;

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
    END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
    END IF;
END $$;

-- Add bnpl_eligible column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'bnpl_eligible') THEN
        ALTER TABLE users ADD COLUMN bnpl_eligible BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

SELECT 'Database schema fixed successfully!' AS status;