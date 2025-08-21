-- RABHAN Admin Service - Complete Manual Database Setup
-- This combines database creation and table creation in one script
-- Execute this script while connected to the 'postgres' database

-- Step 1: Create the database
SELECT 'Step 1: Creating rabhan_admin database...' AS status;

DROP DATABASE IF EXISTS rabhan_admin;
CREATE DATABASE rabhan_admin
  WITH 
  OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'English_United States.1252'
  LC_CTYPE = 'English_United States.1252'
  TABLESPACE = pg_default
  CONNECTION LIMIT = 100;

COMMENT ON DATABASE rabhan_admin IS 'RABHAN Solar BNPL Platform - Admin Management Service Database (Saudi Arabia)';

SELECT 'Database created! Now connect to rabhan_admin and run the table creation script.' AS status;

-- Note: You must now disconnect from 'postgres' and connect to 'rabhan_admin' database
-- Then execute the contents of: migrations/001_create_admin_tables.sql