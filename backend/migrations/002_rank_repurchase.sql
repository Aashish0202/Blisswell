-- =====================================================================
-- 002_rank_repurchase.sql
-- Blisswell Rank / Auto-Repurchase Rework — Phase 0
-- Run against local `blisswell` DB (MariaDB 10.4 / XAMPP):
--   C:\xampp\mysql\bin\mysql.exe -u root blisswell < 002_rank_repurchase.sql
--
-- DESTRUCTIVE (same style as 001): wipes all financial + user data,
-- keeping only the admin user, and replaces the product set with the
-- four rank products.
-- =====================================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ---------------------------------------------------------------------
-- 1. WIPE OLD DATA (keep admin user + reset everything else)
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM users WHERE role != 'admin';

TRUNCATE TABLE wallets;
TRUNCATE TABLE wallet_transactions;
TRUNCATE TABLE orders;
TRUNCATE TABLE cashback_entitlements;
TRUNCATE TABLE cashback_claims;
TRUNCATE TABLE team_income_events;
TRUNCATE TABLE withdrawal_requests;
TRUNCATE TABLE products;

SET FOREIGN_KEY_CHECKS = 1;

-- Reset admin package + rank flags (rank_name/current_product_id may not
-- exist yet on a first run — handled again after the ALTERs below)
UPDATE users SET has_active_package = 0 WHERE role = 'admin';

-- ---------------------------------------------------------------------
-- 2. SCHEMA ALTERS
-- ---------------------------------------------------------------------

-- 2a. users — rank tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rank_name VARCHAR(50) NULL AFTER has_active_package,
  ADD COLUMN IF NOT EXISTS current_product_id INT NULL AFTER rank_name;
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_rank (rank_name);

-- 2b. wallets — repurchase (upgrade) wallet
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS repurchase_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER earnings_balance;

-- Re-seed the admin wallet (TRUNCATE above emptied it) with the new column
INSERT INTO wallets (user_id, balance, earnings_balance, repurchase_balance)
SELECT id, 0, 0, 0 FROM users WHERE role = 'admin'
ON DUPLICATE KEY UPDATE balance = 0, earnings_balance = 0, repurchase_balance = 0;

-- Reset admin package + rank flags (rank columns now guaranteed to exist)
UPDATE users SET has_active_package = 0, rank_name = NULL, current_product_id = NULL WHERE role = 'admin';

-- 2c. orders — auto-repurchase provenance
ALTER TABLE orders
  MODIFY COLUMN payment_type ENUM('wallet','razorpay','repurchase_wallet') DEFAULT 'wallet';
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_source ENUM('user','auto_repurchase') NOT NULL DEFAULT 'user' AFTER status,
  ADD COLUMN IF NOT EXISTS source_withdrawal_id INT NULL AFTER order_source;
ALTER TABLE orders
  ADD INDEX IF NOT EXISTS idx_orders_source (order_source),
  ADD INDEX IF NOT EXISTS idx_orders_src_wd (source_withdrawal_id);

-- 2d. wallet_transactions — widen type ENUM with 'repurchase'
--     (+amount = repurchase share credited from a processed withdrawal;
--      -amount = repurchase balance debited for an auto repurchase)
ALTER TABLE wallet_transactions
  MODIFY COLUMN type ENUM(
    'deposit','purchase','refund','bonus','incentive',
    'self_cashback','team_income','withdrawal','withdrawal_reversal','repurchase'
  ) NOT NULL;

-- 2e. withdrawal_requests — split ledger (recorded at processing time)
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS admin_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amount,
  ADD COLUMN IF NOT EXISTS repurchase_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER admin_charge,
  ADD COLUMN IF NOT EXISTS payout_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER repurchase_amount;

-- 2f. team_income_events — rank provenance
ALTER TABLE team_income_events
  ADD COLUMN IF NOT EXISTS rank_name VARCHAR(50) NULL AFTER amount,
  ADD COLUMN IF NOT EXISTS product_id INT NULL AFTER rank_name;
ALTER TABLE team_income_events
  ADD INDEX IF NOT EXISTS idx_tie_rank (rank_name);

-- 2g. products — rank config
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rank_name VARCHAR(50) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS level_income JSON NULL AFTER rank_name,
  ADD COLUMN IF NOT EXISTS rank_order INT NOT NULL DEFAULT 0 AFTER level_income;

-- ---------------------------------------------------------------------
-- 3. SEED THE FOUR RANK PRODUCTS
--    rank_order = ascending tier (used to find the "next higher" product;
--    stable even if prices are later changed from Admin).
--    level_income = JSON array, levels 1..10 (Gold has no level 8 (kept 0) → 0).
-- ---------------------------------------------------------------------
DELETE FROM products;

INSERT INTO products (name, rank_name, level_income, rank_order, description, price, is_active, created_at) VALUES
(
  'Star',
  'Star',
  '[100,25,25,10,10,10,10,15,15,15]',
  1,
  'Star Rank package. Activates your account and unlocks the Star level income table levels 1..10 for your upline.',
  349.00, 1, NOW()
),
(
  'Silver',
  'Silver',
  '[200,50,50,20,20,20,20,30,30,30]',
  2,
  'Silver Rank package. Activates your account and unlocks the Silver level income table levels 1..10 for your upline.',
  849.00, 1, NOW()
),
(
  'Gold',
  'Gold',
  '[400,100,100,40,40,40,40,0,0,0]',
  3,
  'Gold Rank package. Activates your account and unlocks the Gold level income table levels 1..10 for your upline.',
  1749.00, 1, NOW()
),
(
  'Platinum',
  'Platinum',
  '[800,200,200,80,80,80,80,120,120,120]',
  4,
  'Platinum Rank package. Activates your account and unlocks the Platinum level income table levels 1..10 for your upline.',
  4449.00, 1, NOW()
);

-- ---------------------------------------------------------------------
-- 4. SETTINGS
-- ---------------------------------------------------------------------

-- Retire the old global team income table (per-product tables live on products now)
DELETE FROM settings WHERE setting_key LIKE 'team_income_level_%';

-- Rank tables have 8 levels
UPDATE settings SET setting_value = '10' WHERE setting_key = 'qualification_max_levels';

-- New income settings (idempotent)
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('withdrawal_admin_charge_percent', '5',    'Admin charge percent on withdrawal processing (%)'),
  ('repurchase_share_percent',        '20',   'Percent of withdrawal credited to repurchase wallet (%)'),
  ('auto_repurchase_enabled',         'true', 'Auto repurchase engine master switch')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

COMMIT;

-- ---------------------------------------------------------------------
-- 5. VERIFICATION QUERIES (run manually to confirm)
-- ---------------------------------------------------------------------
-- SELECT COUNT(*) AS products FROM products;                                  -- expect 4
-- SELECT name, rank_name, price, rank_order, level_income FROM products ORDER BY rank_order;
-- SHOW COLUMNS FROM wallets;                                                  -- expect repurchase_balance
-- SHOW COLUMNS FROM withdrawal_requests;                                      -- expect admin_charge, repurchase_amount, payout_amount
-- SELECT setting_key FROM settings WHERE setting_key LIKE 'team_income_level_%'; -- expect 0 rows
-- SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('withdrawal_admin_charge_percent','repurchase_share_percent','auto_repurchase_enabled','qualification_max_levels');