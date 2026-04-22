-- =============================================
-- Blisswell Production Database Migration
-- Run this SQL in your production cPanel database
-- Date: 2026-04-07
-- =============================================

-- Add state column to users table
-- Run this query, it will show error if column already exists (that's OK, just skip)
ALTER TABLE users ADD COLUMN state VARCHAR(50) DEFAULT NULL AFTER mobile;

-- Add address column to users table
-- Run this query, it will show error if column already exists (that's OK, just skip)
ALTER TABLE users ADD COLUMN address TEXT DEFAULT NULL AFTER state;

-- Add company_state to settings table
-- This uses INSERT IGNORE so it won't duplicate if already exists
INSERT IGNORE INTO settings (setting_key, setting_value)
VALUES ('company_state', 'Maharashtra');

-- =============================================
-- ALTERNATIVE: Safer approach using stored procedure
-- Run this block if you want to avoid errors completely
-- =============================================

DELIMITER //

-- Safe column add for 'state'
DROP PROCEDURE IF EXISTS add_state_column//
CREATE PROCEDURE add_state_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'state'
    ) THEN
        ALTER TABLE users ADD COLUMN state VARCHAR(50) DEFAULT NULL AFTER mobile;
    END IF;
END//

-- Safe column add for 'address'
DROP PROCEDURE IF EXISTS add_address_column//
CREATE PROCEDURE add_address_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'address'
    ) THEN
        ALTER TABLE users ADD COLUMN address TEXT DEFAULT NULL AFTER state;
    END IF;
END//

-- Execute procedures
CALL add_state_column()//
CALL add_address_column()//

-- Clean up procedures
DROP PROCEDURE IF EXISTS add_state_column//
DROP PROCEDURE IF EXISTS add_address_column//

DELIMITER ;

-- Add company_state to settings (safe)
INSERT IGNORE INTO settings (setting_key, setting_value)
VALUES ('company_state', 'Maharashtra');