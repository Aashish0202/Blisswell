-- Migration: Add gst_number column to users table
-- Run this SQL to add the GST number field

ALTER TABLE users ADD COLUMN gst_number VARCHAR(15) DEFAULT NULL AFTER pan_number;

-- Optional: Add index for faster lookups
-- ALTER TABLE users ADD INDEX idx_gst_number (gst_number);