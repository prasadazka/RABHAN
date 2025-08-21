-- RABHAN Admin Service - Manual Database Creation
-- Execute this SQL script directly in PostgreSQL to create the admin database
-- 
-- Instructions:
-- 1. Connect to PostgreSQL using pgAdmin, DBeaver, or psql
-- 2. Connect to the 'postgres' database first
-- 3. Execute this script to create the rabhan_admin database
-- 4. Then connect to the rabhan_admin database 
-- 5. Execute the migration script: 001_create_admin_tables.sql

-- Create the database
SELECT 'Creating rabhan_admin database...' AS status;

DROP DATABASE IF EXISTS rabhan_admin;
CREATE DATABASE rabhan_admin
  WITH 
  OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'English_United States.1252'
  LC_CTYPE = 'English_United States.1252'
  TABLESPACE = pg_default
  CONNECTION LIMIT = 100;

-- Add database comment
COMMENT ON DATABASE rabhan_admin IS 'RABHAN Solar BNPL Platform - Admin Management Service Database (Saudi Arabia)';

SELECT 'Database rabhan_admin created successfully!' AS status;
SELECT 'Next: Connect to rabhan_admin database and run 001_create_admin_tables.sql' AS next_step;