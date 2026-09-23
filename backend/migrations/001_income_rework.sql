-- =====================================================================
-- 001_income_rework.sql
-- Blisswell Income System Rework — Phase 0
-- Run against local `blisswell` DB (MariaDB 10.4 / XAMPP):
--   C:\xampp\mysql\bin\mysql.exe -u root blisswell < 001_income_rework.sql
--
-- This migration is DESTRUCTIVE: it wipes all financial + user data,
-- keeping only the admin user (id=1) and inserting one Door Mat product.
-- =====================================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ---------------------------------------------------------------------
-- 1. WIPE OLD DATA (keep admin user + reset everything else)
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

-- Remove every non-admin user (referral tree, customers, etc.)
DELETE FROM users WHERE role != 'admin';

-- Truncate all financial / transactional / legacy tables
TRUNCATE TABLE wallets;
TRUNCATE TABLE wallet_transactions;
TRUNCATE TABLE orders;
TRUNCATE TABLE salary_cycles;
TRUNCATE TABLE salary_payouts;
TRUNCATE TABLE incentive_credits;
TRUNCATE TABLE products;
-- Legacy stat / orphaned user-related tables
TRUNCATE TABLE user_stats;
TRUNCATE TABLE user_kyc;
TRUNCATE TABLE support_tickets;
TRUNCATE TABLE ticket_messages;
-- Gallery / banners / cms_content are site content — left intact.

SET FOREIGN_KEY_CHECKS = 1;

-- Ensure admin (id=1) has a fresh wallet with zero balances
INSERT INTO wallets (user_id, balance, earnings_balance)
SELECT id, 0, 0 FROM users WHERE role = 'admin'
ON DUPLICATE KEY UPDATE balance = 0, earnings_balance = 0;

-- Reset admin package flag
UPDATE users SET has_active_package = 0 WHERE role = 'admin';

-- Insert the single Door Mat product (₹599)
INSERT INTO products (name, description, price, is_active, created_at)
VALUES (
  'Door Mat',
  'Premium Door Mat by Blisswell. Purchase activates Self Cashback (up to ₹200) and Team Income eligibility for your upline.',
  599.00,
  1,
  NOW()
);

-- ---------------------------------------------------------------------
-- 2. DEDUPE + HARDEN `settings` (fix the duplicate-key bug)
-- ---------------------------------------------------------------------
-- Keep only the lowest-id row per setting_key, delete the duplicates.
DELETE s1 FROM settings s1
JOIN settings s2
  ON s1.setting_key = s2.setting_key
 AND s1.id > s2.id;

-- Remove legacy salary/package income settings (no longer used)
DELETE FROM settings
WHERE setting_key IN (
  'default_daily_amount',
  'default_days',
  'min_payout_amount',
  'payout_day',
  'last_payout_date',
  'package_price'
);
-- repurchase_enabled retained (still gates repeat purchases).

-- Enforce uniqueness so Settings.set can never create duplicates again
ALTER TABLE settings
  ADD UNIQUE KEY IF NOT EXISTS uq_settings_key (setting_key);

-- Seed the new income-system settings (idempotent)
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('self_cashback_enabled',          'true',         'Self Cashback master on/off switch'),
  ('self_cashback_amount_per_claim', '10',           'Amount credited per self-cashback claim (₹)'),
  ('self_cashback_max_claims',       '20',           'Maximum claims per entitlement'),
  ('team_income_level_1',            '100',          'Team Income amount for level 1 (₹)'),
  ('team_income_level_2',            '30',           'Team Income amount for level 2 (₹)'),
  ('team_income_level_3',            '30',           'Team Income amount for level 3 (₹)'),
  ('team_income_level_4',            '30',           'Team Income amount for level 4 (₹)'),
  ('team_income_level_5',            '30',           'Team Income amount for level 5 (₹)'),
  ('team_income_level_6',            '30',           'Team Income amount for level 6 (₹)'),
  ('team_income_level_7',            '30',           'Team Income amount for level 7 (₹)'),
  ('team_income_level_8',            '30',           'Team Income amount for level 8 (₹)'),
  ('team_income_level_9',            '30',           'Team Income amount for level 9 (₹)'),
  ('team_income_level_10',           '30',           'Team Income amount for level 10 (₹)'),
  ('qualification_levels_per_direct', '2',           'Max levels unlocked per qualified direct'),
  ('qualification_max_levels',       '10',           'Hard cap on unlocked levels'),
  ('withdrawal_min_amount',          '200',          'Minimum withdrawal amount (₹)'),
  ('withdrawal_start_time',          '07:00',        'Withdrawal window start (IST, 24h)'),
  ('withdrawal_end_time',            '10:00',        'Withdrawal window end (IST, 24h)'),
  ('withdrawal_timezone',            'Asia/Kolkata', 'Timezone for withdrawal window / server time')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ---------------------------------------------------------------------
-- 3. EXTEND `wallet_transactions`
-- ---------------------------------------------------------------------
-- Widen type ENUM (withdrawal already exists; add the new income types)
ALTER TABLE wallet_transactions
  MODIFY COLUMN type ENUM(
    'deposit','purchase','refund','bonus','incentive',
    'self_cashback','team_income','withdrawal','withdrawal_reversal'
  ) NOT NULL;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS level INT NULL AFTER amount,
  ADD COLUMN IF NOT EXISTS source_user_id INT NULL AFTER level,
  ADD COLUMN IF NOT EXISTS reference_key VARCHAR(64) NULL AFTER status;

ALTER TABLE wallet_transactions
  ADD UNIQUE KEY IF NOT EXISTS uq_wt_ref (reference_key),
  ADD INDEX IF NOT EXISTS idx_wt_user_type (user_id, type),
  ADD INDEX IF NOT EXISTS idx_wt_source (source_user_id);

-- ---------------------------------------------------------------------
-- 4. NEW TABLES
-- ---------------------------------------------------------------------

-- 4a. Self Cashback entitlement (one per order, created at purchase time)
DROP TABLE IF EXISTS cashback_entitlements;
CREATE TABLE cashback_entitlements (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  product_id INT NULL,
  amount_per_claim DECIMAL(12,2) NOT NULL DEFAULT 10.00,
  max_claims INT NOT NULL DEFAULT 20,
  claims_completed INT NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active','exhausted','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ce_order (order_id),
  INDEX idx_ce_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4b. Self Cashback claims (one per calendar day per user)
DROP TABLE IF EXISTS cashback_claims;
CREATE TABLE cashback_claims (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  entitlement_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  claim_date DATE NOT NULL,
  reference_key VARCHAR(64) NOT NULL,
  transaction_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cc_ref (reference_key),
  UNIQUE KEY uq_cc_user_day (user_id, claim_date),
  INDEX idx_cc_entitlement (entitlement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4c. Team Income distribution events (idempotent via reference_key)
DROP TABLE IF EXISTS team_income_events;
CREATE TABLE team_income_events (
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
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_tie_ref (reference_key),
  INDEX idx_tie_upline (upline_id),
  INDEX idx_tie_order (order_id),
  INDEX idx_tie_purchaser (purchaser_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4d. Withdrawal requests (user-initiated)
DROP TABLE IF EXISTS withdrawal_requests;
CREATE TABLE withdrawal_requests (
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
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wr_ref (reference_key),
  INDEX idx_wr_user_status (user_id, status),
  INDEX idx_wr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4e. Settings audit log
DROP TABLE IF EXISTS setting_audit_logs;
CREATE TABLE setting_audit_logs (
  id INT NOT NULL AUTO_INCREMENT,
  admin_id INT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  previous_value TEXT NULL,
  new_value TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  INDEX idx_sal_admin (admin_id),
  INDEX idx_sal_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 5. DROP BUSINESS BONUS TABLES + legacy salary view (feature removed entirely)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS bonus_payouts;
DROP TABLE IF EXISTS business_bonuses;
DROP VIEW IF EXISTS salary_summary;

COMMIT;

-- ---------------------------------------------------------------------
-- 6. VERIFICATION QUERIES (run manually to confirm)
-- ---------------------------------------------------------------------
-- SELECT COUNT(*) AS admin_users FROM users WHERE role='admin';            -- expect 1
-- SELECT COUNT(*) AS products FROM products;                              -- expect 1
-- SELECT COUNT(*) AS dup_settings FROM (SELECT setting_key FROM settings GROUP BY setting_key HAVING COUNT(*)>1) t; -- expect 0
-- SELECT setting_key, setting_value FROM settings ORDER BY setting_key;
-- SHOW CREATE TABLE wallet_transactions\G
-- SHOW TABLES;  -- bonus_payouts / business_bonuses gone; 5 new tables present