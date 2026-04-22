-- =============================================
-- Blisswell Production Database Migration
-- Simple SQL for phpMyAdmin (cPanel)
-- =============================================

-- 1. Add state column to users table
-- (Ignore error if column already exists)
ALTER TABLE users ADD COLUMN state VARCHAR(50) DEFAULT NULL AFTER mobile;

-- 2. Add address column to users table
-- (Ignore error if column already exists)
ALTER TABLE users ADD COLUMN address TEXT DEFAULT NULL AFTER state;

-- 3. Add company_state setting
-- (INSERT IGNORE won't error if already exists)
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('company_state', 'Maharashtra');