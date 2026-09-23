-- =====================================================================
-- 004_add_pincode.sql
-- Add pincode to users (required for order delivery).
-- Idempotent — safe to re-run.
--   mysql -u <user> -p <dbname> < 004_add_pincode.sql
-- =====================================================================

SET NAMES utf8mb4;

-- users.pincode — Indian 6-digit pincode, nullable so existing rows load fine
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='pincode')=0,
  'ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL AFTER address', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;