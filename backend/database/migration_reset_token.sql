-- Migration: Add password reset token fields to users table
-- Run this if you already have an existing database

-- Add reset_token column if it doesn't exist
-- MySQL doesn't have IF NOT EXISTS for ALTER TABLE, so we check first

SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname1 = 'reset_token';
SET @columnname2 = 'reset_token_expires';

-- Check and add reset_token column
SET @preparedStatement1 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname1) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname1, ' VARCHAR(255) DEFAULT NULL')
));
PREPARE alterIfExists1 FROM @preparedStatement1;
EXECUTE alterIfExists1;
DEALLOCATE PREPARE alterIfExists1;

-- Check and add reset_token_expires column
SET @preparedStatement2 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname2) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname2, ' TIMESTAMP NULL DEFAULT NULL')
));
PREPARE alterIfExists2 FROM @preparedStatement2;
EXECUTE alterIfExists2;
DEALLOCATE PREPARE alterIfExists2;

-- Add index for reset_token
SET @preparedStatement3 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_reset_token') > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX idx_reset_token ON ', @tablename, ' (reset_token)')
));
PREPARE alterIfExists3 FROM @preparedStatement3;
EXECUTE alterIfExists3;
DEALLOCATE PREPARE alterIfExists3;