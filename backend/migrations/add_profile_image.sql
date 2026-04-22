-- =============================================
-- Add profile_image column to users table
-- Date: 2026-04-17
-- =============================================

-- Safe column add for 'profile_image'
DELIMITER //

DROP PROCEDURE IF EXISTS add_profile_image_column//

CREATE PROCEDURE add_profile_image_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'profile_image'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER address;
    END IF;
END//

-- Execute procedure
CALL add_profile_image_column()//

-- Clean up procedure
DROP PROCEDURE IF EXISTS add_profile_image_column//

DELIMITER ;

-- =============================================
-- Alternative: Simple ALTER TABLE (run this if above doesn't work)
-- May show error if column already exists - that's OK
-- =============================================
-- ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER address;