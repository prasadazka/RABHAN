-- Create RABHAN databases
-- Run this in pgAdmin or psql

-- Drop databases if they exist (for clean setup)
DROP DATABASE IF EXISTS rabhan_auth;
DROP DATABASE IF EXISTS rabhan_documents;
DROP DATABASE IF EXISTS rabhan_users;

-- Create databases
CREATE DATABASE rabhan_auth;
CREATE DATABASE rabhan_documents;
CREATE DATABASE rabhan_users;

-- Show created databases
SELECT datname FROM pg_database WHERE datname LIKE 'rabhan_%';