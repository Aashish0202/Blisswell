-- =====================================================================
-- 003_production_income_rework.sql
-- Blisswell Income System Rework — NON-DESTRUCTIVE PRODUCTION MIGRATION
-- ---------------------------------------------------------------------
-- Purpose: bring the PRODUCTION database (old salary-era schema) up to
-- the new income-system schema WITHOUT wiping any user/financial data.
--
-- Run ONCE on the production DB (phpMyAdmin SQL tab or mysql CLI):
--   mysql -u <user> -p <dbname> < 003_production_income_rework.sql
--
-- WHAT IT DOES (all steps idempotent — safe to re-run):
--   1. users      + rank_name, current_product_id, idx
--   2. wallets    + repurchase_balance (default 0 — existing balances untouched)
--   3. wallet_transactions: widen type ENUM (+self_cashback, team_income,
--      withdrawal_reversal, repurchase), + level, source_user_id,
--      reference_key + indexes
--   4. orders     + order_source, source_withdrawal_id, payment_type
--      ENUM widened (+repurchase_wallet)
--   5. withdrawal_requests table created if missing (+ split-ledger columns)
--   6. products   + rank_name, level_income, rank_order; LEGACY products are
--      DEACTIVATED (is_active=0, rows kept so old orders still resolve);
--      the 4 rank products are inserted if not already present
--   7. cashback_entitlements / cashback_claims / team_income_events /
--      setting_audit_logs created if missing
--   8. settings: new income-system keys seeded; per-product rank tables
--      replace the old global team_income_level_* keys
--
-- WHAT IT DOES NOT DO (why it is safe):
--   * No DELETE/TRUNCATE of users, wallets, wallet_transactions, orders
--   * No DROP of legacy salary tables (salary_cycles, salary_payouts,
--     incentive_credits, salary_summary) — they are simply no longer used
--     by the new code; drop them manually later if you want
--   * Existing product rows are kept (only flagged inactive)
--
-- Run the VERIFICATION QUERIES at the bottom after executing.
-- =====================================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ---------------------------------------------------------------------
-- Helper pattern: every guarded step follows this shape.
-- (Plain MySQL has no ADD COLUMN IF NOT EXISTS.)
-- ---------------------------------------------------------------------
-- SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
--   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='<t>' AND COLUMN_NAME='<c>')=0,
--   '<DDL>', 'SELECT 1'));
-- PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 1. users — rank tracking
-- ---------------------------------------------------------------------
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='rank_name')=0,
  'ALTER TABLE users ADD COLUMN rank_name VARCHAR(50) NULL AFTER has_active_package', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='current_product_id')=0,
  'ALTER TABLE users ADD COLUMN current_product_id INT NULL AFTER rank_name', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_rank')=0,
  'ALTER TABLE users ADD INDEX idx_users_rank (rank_name)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 2. wallets — repurchase (upgrade) wallet
-- ---------------------------------------------------------------------
-- Guard in order: base-schema DBs may not even have earnings_balance yet,
-- and the repurchase column is positioned AFTER it.
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallets' AND COLUMN_NAME='earnings_balance')=0,
  'ALTER TABLE wallets ADD COLUMN earnings_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER balance', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallets' AND COLUMN_NAME='repurchase_balance')=0,
  'ALTER TABLE wallets ADD COLUMN repurchase_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER earnings_balance', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 3. wallet_transactions — new income types + idempotency columns
-- ---------------------------------------------------------------------
-- Widen the type ENUM (superset: every value the old schema could hold,
-- plus the new ones). Safe to re-run; no data is modified.
ALTER TABLE wallet_transactions
  MODIFY COLUMN type ENUM(
    'deposit','purchase','refund','bonus','incentive',
    'self_cashback','team_income','withdrawal','withdrawal_reversal','repurchase'
  ) NOT NULL;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND COLUMN_NAME='level')=0,
  'ALTER TABLE wallet_transactions ADD COLUMN level INT NULL AFTER amount', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND COLUMN_NAME='source_user_id')=0,
  'ALTER TABLE wallet_transactions ADD COLUMN source_user_id INT NULL AFTER level', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND COLUMN_NAME='reference_key')=0,
  'ALTER TABLE wallet_transactions ADD COLUMN reference_key VARCHAR(64) NULL AFTER status', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND INDEX_NAME='uq_wt_ref')=0,
  'ALTER TABLE wallet_transactions ADD UNIQUE KEY uq_wt_ref (reference_key)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND INDEX_NAME='idx_wt_user_type')=0,
  'ALTER TABLE wallet_transactions ADD INDEX idx_wt_user_type (user_id, type)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND INDEX_NAME='idx_wt_source')=0,
  'ALTER TABLE wallet_transactions ADD INDEX idx_wt_source (source_user_id)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 4. orders — auto-repurchase provenance
-- ---------------------------------------------------------------------
ALTER TABLE orders
  MODIFY COLUMN payment_type ENUM('wallet','razorpay','repurchase_wallet') DEFAULT 'wallet';

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='order_source')=0,
  'ALTER TABLE orders ADD COLUMN order_source ENUM(''user'',''auto_repurchase'') NOT NULL DEFAULT ''user'' AFTER status', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='source_withdrawal_id')=0,
  'ALTER TABLE orders ADD COLUMN source_withdrawal_id INT NULL AFTER order_source', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND INDEX_NAME='idx_orders_source')=0,
  'ALTER TABLE orders ADD INDEX idx_orders_source (order_source)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND INDEX_NAME='idx_orders_src_wd')=0,
  'ALTER TABLE orders ADD INDEX idx_orders_src_wd (source_withdrawal_id)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 5. withdrawal_requests — created if missing, upgraded if pre-existing
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','processed','rejected','reversed') NOT NULL DEFAULT 'pending',
  transaction_id INT NULL,
  reversal_transaction_id INT NULL,
  processed_by INT NULL,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  reject_reason VARCHAR(255) NULL,
  reference_key VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wr_ref (reference_key),
  INDEX idx_wr_user_status (user_id, status),
  INDEX idx_wr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- If a differently-shaped withdrawal_requests table already existed, add
-- whatever split-ledger columns it is missing:
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='withdrawal_requests' AND COLUMN_NAME='admin_charge')=0,
  'ALTER TABLE withdrawal_requests ADD COLUMN admin_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amount', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='withdrawal_requests' AND COLUMN_NAME='repurchase_amount')=0,
  'ALTER TABLE withdrawal_requests ADD COLUMN repurchase_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER admin_charge', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='withdrawal_requests' AND COLUMN_NAME='payout_amount')=0,
  'ALTER TABLE withdrawal_requests ADD COLUMN payout_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER repurchase_amount', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='withdrawal_requests' AND COLUMN_NAME='reference_key')=0,
  'ALTER TABLE withdrawal_requests ADD COLUMN reference_key VARCHAR(64) NULL AFTER reject_reason', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 6. products — rank config; legacy products deactivated, rank products added
-- ---------------------------------------------------------------------
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='rank_name')=0,
  'ALTER TABLE products ADD COLUMN rank_name VARCHAR(50) NULL AFTER name', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='level_income')=0,
  'ALTER TABLE products ADD COLUMN level_income JSON NULL AFTER rank_name', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='rank_order')=0,
  'ALTER TABLE products ADD COLUMN rank_order INT NOT NULL DEFAULT 0 AFTER level_income', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Deactivate legacy (salary-era) products — rows are KEPT so historical
-- orders still resolve their product_id. Re-running never touches rank
-- products (they always have rank_name set).
UPDATE products SET is_active = 0 WHERE rank_name IS NULL AND is_active = 1;

-- Insert the 4 rank products, each only if not already present.
INSERT INTO products (name, rank_name, level_income, rank_order, description, price, is_active, created_at)
SELECT 'Star', 'Star', '[100,25,25,10,10,10,10,15,15,15]', 1,
       'Star Rank package. Activates your account and unlocks the Star level income table levels 1..10 for your upline.',
       349.00, 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE rank_name = 'Star');

INSERT INTO products (name, rank_name, level_income, rank_order, description, price, is_active, created_at)
SELECT 'Silver', 'Silver', '[200,50,50,20,20,20,20,30,30,30]', 2,
       'Silver Rank package. Activates your account and unlocks the Silver level income table levels 1..10 for your upline.',
       849.00, 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE rank_name = 'Silver');

INSERT INTO products (name, rank_name, level_income, rank_order, description, price, is_active, created_at)
SELECT 'Gold', 'Gold', '[400,100,100,40,40,40,40,0,0,0]', 3,
       'Gold Rank package. Activates your account and unlocks the Gold level income table levels 1..10 for your upline.',
       1749.00, 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE rank_name = 'Gold');

INSERT INTO products (name, rank_name, level_income, rank_order, description, price, is_active, created_at)
SELECT 'Platinum', 'Platinum', '[800,200,200,80,80,80,80,120,120,120]', 4,
       'Platinum Rank package. Activates your account and unlocks the Platinum level income table levels 1..10 for your upline.',
       4449.00, 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE rank_name = 'Platinum');

-- ---------------------------------------------------------------------
-- 7. New tables (created only if missing)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cashback_entitlements (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  product_id INT NULL,
  amount_per_claim DECIMAL(12,2) NOT NULL DEFAULT 10.00,
  max_claims INT NOT NULL DEFAULT 20,
  claims_completed INT NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active','exhausted','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ce_order (order_id),
  INDEX idx_ce_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS cashback_claims (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  entitlement_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  claim_date DATE NOT NULL,
  reference_key VARCHAR(64) NOT NULL,
  transaction_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cc_ref (reference_key),
  UNIQUE KEY uq_cc_user_day (user_id, claim_date),
  INDEX idx_cc_entitlement (entitlement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS team_income_events (
  id INT NOT NULL AUTO_INCREMENT,
  order_id VARCHAR(100) NOT NULL,
  purchaser_id INT NOT NULL,
  upline_id INT NOT NULL,
  level INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  qualified_directs INT NOT NULL,
  max_unlocked_level INT NOT NULL,
  reference_key VARCHAR(64) NOT NULL,
  transaction_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tie_ref (reference_key),
  INDEX idx_tie_upline (upline_id),
  INDEX idx_tie_order (order_id),
  INDEX idx_tie_purchaser (purchaser_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- team_income_events rank provenance (only needed if the table pre-existed
-- without these columns; skipped when just created above):
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='team_income_events' AND COLUMN_NAME='rank_name')=0,
  'ALTER TABLE team_income_events ADD COLUMN rank_name VARCHAR(50) NULL AFTER amount', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='team_income_events' AND COLUMN_NAME='product_id')=0,
  'ALTER TABLE team_income_events ADD COLUMN product_id INT NULL AFTER rank_name', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='team_income_events' AND INDEX_NAME='idx_tie_rank')=0,
  'ALTER TABLE team_income_events ADD INDEX idx_tie_rank (rank_name)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='team_income_events' AND INDEX_NAME='idx_tie_product')=0,
  'ALTER TABLE team_income_events ADD INDEX idx_tie_product (product_id)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS setting_audit_logs (
  id INT NOT NULL AUTO_INCREMENT,
  admin_id INT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  previous_value TEXT NULL,
  new_value TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sal_admin (admin_id),
  INDEX idx_sal_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 8. settings — seed new keys, retire per-product-replaced global table
-- ---------------------------------------------------------------------
-- settings.setting_key is already UNIQUE on the production schema
-- (database/schema.sql), so no dedupe/uniqueness work is required here.

INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('self_cashback_enabled',           'true',         'Self Cashback master on/off switch'),
  ('self_cashback_amount_per_claim',  '10',           'Amount credited per self-cashback claim (₹)'),
  ('self_cashback_max_claims',        '20',           'Maximum claims per entitlement'),
  ('qualification_levels_per_direct', '2',            'Max levels unlocked per qualified direct'),
  ('qualification_max_levels',        '10',            'Hard cap on unlocked levels (rank tables have 10 levels)'),
  ('withdrawal_min_amount',           '200',          'Minimum withdrawal amount (₹)'),
  ('withdrawal_start_time',           '07:00',        'Withdrawal window start (IST, 24h)'),
  ('withdrawal_end_time',             '10:00',        'Withdrawal window end (IST, 24h)'),
  ('withdrawal_timezone',             'Asia/Kolkata', 'Timezone for withdrawal window / server time'),
  ('withdrawal_admin_charge_percent', '5',            'Admin charge percent on withdrawal processing (%)'),
  ('repurchase_share_percent',        '20',           'Percent of withdrawal credited to repurchase wallet (%)'),
  ('auto_repurchase_enabled',         'true',         'Auto repurchase engine master switch')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- The old global team-income table is replaced by per-product level_income
-- JSON — remove the stale keys so the admin Settings page stays clean.
DELETE FROM settings WHERE setting_key LIKE 'team_income_level_%';

-- ---------------------------------------------------------------------
-- 9. product designs + order design selection
-- ---------------------------------------------------------------------
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='designs')=0,
  'ALTER TABLE products ADD COLUMN designs TEXT NULL AFTER youtube_link', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='design_name')=0,
  'ALTER TABLE orders ADD COLUMN design_name VARCHAR(100) NULL AFTER product_id', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------
-- 10. performance indexes for high traffic / large tables
-- ---------------------------------------------------------------------
-- Hot read paths that previously did full table scans once the user /
-- order / transaction volume grows:
--   users.referred_by      → directs counts, downline CTE walk, team stats
--   users.referral_code    → login lookup (referral code IS the login id)
--   wallets.user_id        → every wallet read/update in every transaction
--   orders.user_id         → user order lists/counts
--   orders (status,created_at) → stuck-'processing' cron + admin date filters
--   orders.order_number    → invoice lookup
--   wallet_transactions.payment_id → Razorpay verify dedupe lookup
--   wallet_transactions (user_id,created_at) → history pages (filter+sort)

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_referred')=0,
  'ALTER TABLE users ADD INDEX idx_users_referred (referred_by, has_active_package)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_refcode')=0,
  'ALTER TABLE users ADD INDEX idx_users_refcode (referral_code)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallets' AND INDEX_NAME='idx_wallets_user')=0,
  'ALTER TABLE wallets ADD INDEX idx_wallets_user (user_id)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND INDEX_NAME='idx_orders_user')=0,
  'ALTER TABLE orders ADD INDEX idx_orders_user (user_id, status)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND INDEX_NAME='idx_orders_status_created')=0,
  'ALTER TABLE orders ADD INDEX idx_orders_status_created (status, created_at)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND INDEX_NAME='idx_orders_number')=0,
  'ALTER TABLE orders ADD INDEX idx_orders_number (order_number)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND INDEX_NAME='idx_wt_payment')=0,
  'ALTER TABLE wallet_transactions ADD INDEX idx_wt_payment (payment_id)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND INDEX_NAME='idx_wt_user_created')=0,
  'ALTER TABLE wallet_transactions ADD INDEX idx_wt_user_created (user_id, created_at)', 'SELECT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

COMMIT;

-- =====================================================================
-- 9. VERIFICATION QUERIES (run manually after the migration)
-- =====================================================================
-- -- New columns present:
-- SHOW COLUMNS FROM users WHERE Field IN ('rank_name','current_product_id');
-- SHOW COLUMNS FROM wallets WHERE Field = 'repurchase_balance';
-- SHOW COLUMNS FROM wallet_transactions WHERE Field IN ('level','source_user_id','reference_key');
-- SHOW COLUMNS FROM orders WHERE Field IN ('order_source','source_withdrawal_id');
-- SHOW COLUMNS FROM products WHERE Field IN ('rank_name','level_income','rank_order');
-- -- New tables present:
-- SHOW TABLES LIKE 'team_income_events';
-- SHOW TABLES LIKE 'withdrawal_requests';
-- SHOW TABLES LIKE 'cashback_entitlements';
-- SHOW TABLES LIKE 'cashback_claims';
-- SHOW TABLES LIKE 'setting_audit_logs';
-- -- Exactly 4 active rank products:
-- SELECT id, name, rank_name, price, rank_order, is_active FROM products ORDER BY rank_order;
-- -- Data survived:
-- SELECT COUNT(*) AS users_total FROM users;
-- SELECT COUNT(*) AS wallet_tx_total FROM wallet_transactions;
-- SELECT COUNT(*) AS orders_total FROM orders;
-- -- Settings:
-- SELECT setting_key, setting_value FROM settings
--  WHERE setting_key IN ('withdrawal_min_amount','withdrawal_admin_charge_percent',
--                        'repurchase_share_percent','auto_repurchase_enabled','qualification_max_levels');