-- Migration: Add index on phone field for performance optimization
-- This improves login performance when using phone numbers

-- Create index on phone field for faster lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_users_phone IS 'Index for phone-based login performance optimization';