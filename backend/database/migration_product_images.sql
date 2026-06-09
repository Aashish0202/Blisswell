-- Migration: Add multiple images support for products
-- This migration changes the single 'image' column to 'images' array

-- First, add the new 'images' column as JSON (or TEXT for MySQL 5.6 compatibility)
ALTER TABLE products ADD COLUMN images TEXT AFTER price;

-- Migrate existing single image data to images array format
-- Each existing image URL becomes a JSON array with one element
UPDATE products
SET images = JSON_ARRAY(image)
WHERE image IS NOT NULL AND image != '' AND images IS NULL;

-- Add index for faster queries
-- ALTER TABLE products ADD INDEX idx_images ((CAST(images AS JSON))); -- Only for MySQL 8.0+

-- Note: We're keeping the 'image' column for backward compatibility
-- It can be removed in a future migration after verifying everything works