-- ============================================
-- DATABASE USER & PERMISSIONS SCRIPT
-- Rigoo Marine - Production Security
-- ============================================
-- This script creates a least-privilege database user
-- Run this ONCE as a superuser (e.g., postgres)
-- ============================================

-- 1. Create the application database user with a strong password
-- Replace 'YOUR_STRONG_PASSWORD_HERE' with an actual secure password
-- Generated with: openssl rand -base64 32
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rigoomarine_app') THEN
        CREATE ROLE rigoomarine_app WITH
            LOGIN
            PASSWORD 'YOUR_STRONG_PASSWORD_HERE'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            CONNECTION LIMIT 50;
    END IF;
END
$$;

-- 2. Grant database connection
GRANT CONNECT ON DATABASE rigoomarine TO rigoomarine_app;

-- 3. Grant schema usage
GRANT USAGE ON SCHEMA public TO rigoomarine_app;

-- 4. Grant table permissions (DML only - NO DDL)
-- This grants SELECT, INSERT, UPDATE, DELETE on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rigoomarine_app;

-- 5. Grant sequence permissions (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rigoomarine_app;

-- 6. Grant function permissions (if any stored procedures exist)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rigoomarine_app;

-- 7. Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rigoomarine_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO rigoomarine_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO rigoomarine_app;

-- 8. Revoke dangerous permissions (defense in depth)
REVOKE CREATE ON SCHEMA public FROM rigoomarine_app;
REVOKE ALL ON DATABASE rigoomarine FROM rigoomarine_app;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:

-- Check user exists and has correct attributes
-- SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_catalog.pg_roles WHERE rolname = 'rigoomarine_app';

-- Check table permissions
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'rigoomarine_app';

-- ============================================
-- PRODUCTION NOTES
-- ============================================
-- 1. Change the password before deploying
-- 2. Store the password in a secrets manager (AWS Secrets Manager, HashiCorp Vault)
-- 3. Rotate credentials every 90 days
-- 4. Monitor failed login attempts in pg_log
-- 5. Use SSL/TLS for all production connections
-- ============================================
