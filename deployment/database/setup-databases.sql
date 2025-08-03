-- RABHAN BNPL Platform - Production Database Setup
-- PostgreSQL Database Creation and User Management

-- =====================================================
-- SECURITY NOTICE: 
-- Update passwords with generated secrets before running!
-- =====================================================

-- Create databases
CREATE DATABASE rabhan_auth WITH 
    ENCODING 'UTF8' 
    LC_COLLATE = 'en_US.UTF-8' 
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE template0;

CREATE DATABASE rabhan_user WITH 
    ENCODING 'UTF8' 
    LC_COLLATE = 'en_US.UTF-8' 
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE template0;

CREATE DATABASE rabhan_documents WITH 
    ENCODING 'UTF8' 
    LC_COLLATE = 'en_US.UTF-8' 
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE template0;

CREATE DATABASE rabhan_contractors WITH 
    ENCODING 'UTF8' 
    LC_COLLATE = 'en_US.UTF-8' 
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE template0;

-- Create service users with secure passwords
-- IMPORTANT: Replace these with generated secure passwords
CREATE USER rabhan_auth WITH 
    ENCRYPTED PASSWORD 'REPLACE_WITH_SECURE_AUTH_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;

CREATE USER rabhan_user WITH 
    ENCRYPTED PASSWORD 'REPLACE_WITH_SECURE_USER_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;

CREATE USER rabhan_documents WITH 
    ENCRYPTED PASSWORD 'REPLACE_WITH_SECURE_DOCUMENT_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;

CREATE USER rabhan_contractors WITH 
    ENCRYPTED PASSWORD 'REPLACE_WITH_SECURE_CONTRACTOR_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE rabhan_auth TO rabhan_auth;
GRANT ALL PRIVILEGES ON DATABASE rabhan_user TO rabhan_user;
GRANT ALL PRIVILEGES ON DATABASE rabhan_documents TO rabhan_documents;
GRANT ALL PRIVILEGES ON DATABASE rabhan_contractors TO rabhan_contractors;

-- Connect to each database and grant schema privileges
\c rabhan_auth;
GRANT ALL ON SCHEMA public TO rabhan_auth;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rabhan_auth;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rabhan_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rabhan_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rabhan_auth;

\c rabhan_user;
GRANT ALL ON SCHEMA public TO rabhan_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rabhan_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rabhan_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rabhan_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rabhan_user;

\c rabhan_documents;
GRANT ALL ON SCHEMA public TO rabhan_documents;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rabhan_documents;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rabhan_documents;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rabhan_documents;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rabhan_documents;

\c rabhan_contractors;
GRANT ALL ON SCHEMA public TO rabhan_contractors;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rabhan_contractors;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rabhan_contractors;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rabhan_contractors;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rabhan_contractors;

-- Enable necessary extensions
\c rabhan_auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c rabhan_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c rabhan_documents;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c rabhan_contractors;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create backup user (read-only for backups)
\c postgres;
CREATE USER rabhan_backup WITH 
    ENCRYPTED PASSWORD 'REPLACE_WITH_SECURE_BACKUP_PASSWORD'
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE;

-- Grant read-only access to backup user
GRANT CONNECT ON DATABASE rabhan_auth TO rabhan_backup;
GRANT CONNECT ON DATABASE rabhan_user TO rabhan_backup;
GRANT CONNECT ON DATABASE rabhan_documents TO rabhan_backup;
GRANT CONNECT ON DATABASE rabhan_contractors TO rabhan_backup;

\c rabhan_auth;
GRANT USAGE ON SCHEMA public TO rabhan_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rabhan_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO rabhan_backup;

\c rabhan_user;
GRANT USAGE ON SCHEMA public TO rabhan_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rabhan_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO rabhan_backup;

\c rabhan_documents;
GRANT USAGE ON SCHEMA public TO rabhan_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rabhan_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO rabhan_backup;

\c rabhan_contractors;
GRANT USAGE ON SCHEMA public TO rabhan_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rabhan_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO rabhan_backup;