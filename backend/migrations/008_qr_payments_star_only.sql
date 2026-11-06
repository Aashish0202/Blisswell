-- 008: QR/UPI manual payments + Star-only package + repurchase wallet retired.
--
-- OPTIONAL: the backend applies all of this itself on startup
-- (PaymentRequest.ensureSchema() in server.js). Running it first on
-- production is equivalent. Steps 2-3 fail harmlessly if already applied.
SET NAMES utf8mb4;

-- 1. Manual QR payment requests (no order exists until admin approval)
CREATE TABLE IF NOT EXISTS payment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  design_name VARCHAR(100) NULL,
  design_image VARCHAR(500) NULL,
  amount DECIMAL(12,2) NOT NULL,
  utr VARCHAR(50) NOT NULL,
  screenshot VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(500) NULL,
  order_id INT NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_requests_utr (utr),
  INDEX idx_payment_requests_user (user_id, status),
  INDEX idx_payment_requests_status (status, created_at)
);

-- 2. Orders paid by QR
ALTER TABLE orders MODIFY payment_type ENUM('wallet','razorpay','repurchase_wallet','qr') DEFAULT 'wallet';

-- 3. Only the Star package is purchasable; every other product is display-only
ALTER TABLE products ADD COLUMN is_purchasable BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active;
UPDATE products SET is_purchasable = TRUE WHERE rank_order = 1 OR rank_name = 'Star';

-- 4. Payment method defaults (Razorpay on, QR off until admin uploads a QR)
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('payment_razorpay_enabled', 'true'),
  ('payment_qr_enabled', 'false');

-- 5. Repurchase wallet / auto-upgrade retired (legacy keys left inert)
UPDATE settings SET setting_value = '0' WHERE setting_key = 'repurchase_share_percent';
UPDATE settings SET setting_value = 'false' WHERE setting_key IN ('auto_repurchase_enabled', 'repurchase_enabled');

-- Check
SELECT id, name, price, is_active, is_purchasable FROM products ORDER BY rank_order;
