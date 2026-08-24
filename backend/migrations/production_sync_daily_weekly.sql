-- =====================================================================
-- Blisswell — production sync: monthly -> daily incentive + two-wallet
--                            + weekly payout-day model
-- ---------------------------------------------------------------------
-- Run this ONCE on the PRODUCTION database (phpMyAdmin or `mysql` CLI).
-- It is IDEMPOTENT: safe to re-run (every ALTER is guarded by an
-- INFORMATION_SCHEMA check; every INSERT uses ON DUPLICATE KEY UPDATE).
--
-- What it does (matches your testing DB exactly):
--   1. wallets.earnings_balance          (withdrawable balance wallet)
--   2. products.daily_amount / days      (daily model, backfilled from salary_*)
--      products.images / youtube_link     (multi-image + video)
--   3. salary_cycles daily_*             (daily model, existing cycles converted)
--   4. incentive_credits table            (daily credit ledger + idempotency)
--   5. salary_payouts payouts as withdrawals (cycle_id/month/year nullable,
--      payout_date added, legacy unique index dropped)
--   6. wallet_transactions.type enum     (+incentive, +withdrawal)
--   7. orders.status enum                (+failed) + backfill empty->failed
--   8. settings                          (drop legacy, add payout_day,
--      last_payout_date, min_payout_amount, default_daily_amount, default_days)
--   9. salary_summary view               (daily liability)
--
-- NOTES
--   * Existing monthly cycles are converted 1:1 (daily_amount=monthly_amount,
--     days=duration, days_paid=months_paid, start_date=start_month). This
--     preserves the total payout but compresses the timeline ~30x — this is
--     the behavior you chose to keep for old cycles.
--   * Old salary_payouts rows (monthly payouts) are left as-is; new withdrawal
--     rows use cycle_id IS NULL + payout_date.
--   * Back up production before running.
-- =====================================================================

-- ---------- helper: add a column only if it does not exist ----------
-- (plain MySQL has no ADD COLUMN IF NOT EXISTS, so each add is guarded.)


-- =====================================================================
-- 1. wallets.earnings_balance
-- =====================================================================
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallets' AND COLUMN_NAME='earnings_balance')>0,
  'SELECT 1','ALTER TABLE wallets ADD COLUMN earnings_balance DECIMAL(12,2) DEFAULT 0.00 AFTER balance'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;


-- =====================================================================
-- 2. products: daily_amount, days, images, youtube_link  + backfill
-- =====================================================================
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='daily_amount')>0,
  'SELECT 1','ALTER TABLE products ADD COLUMN daily_amount DECIMAL(12,2) DEFAULT 0.00 AFTER salary_duration'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='days')>0,
  'SELECT 1','ALTER TABLE products ADD COLUMN days INT DEFAULT 0 AFTER daily_amount'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='images')>0,
  'SELECT 1','ALTER TABLE products ADD COLUMN images TEXT DEFAULT NULL AFTER image'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='youtube_link')>0,
  'SELECT 1','ALTER TABLE products ADD COLUMN youtube_link VARCHAR(500) DEFAULT NULL AFTER images'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill daily_amount/days from legacy monthly fields where empty
UPDATE products
SET daily_amount = salary_amount, days = COALESCE(salary_duration, 12)
WHERE (daily_amount = 0 OR daily_amount IS NULL) AND salary_amount IS NOT NULL;


-- =====================================================================
-- 3. salary_cycles: daily_amount, days, days_paid, start_date  + convert
-- =====================================================================
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_cycles' AND COLUMN_NAME='daily_amount')>0,
  'SELECT 1','ALTER TABLE salary_cycles ADD COLUMN daily_amount DECIMAL(12,2) DEFAULT 0.00 AFTER monthly_amount'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_cycles' AND COLUMN_NAME='days')>0,
  'SELECT 1','ALTER TABLE salary_cycles ADD COLUMN days INT DEFAULT 0 AFTER duration'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_cycles' AND COLUMN_NAME='days_paid')>0,
  'SELECT 1','ALTER TABLE salary_cycles ADD COLUMN days_paid INT DEFAULT 0 AFTER months_paid'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_cycles' AND COLUMN_NAME='start_date')>0,
  'SELECT 1','ALTER TABLE salary_cycles ADD COLUMN start_date DATE NULL AFTER start_month'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- Convert existing monthly cycles 1:1 to the daily model
UPDATE salary_cycles
SET daily_amount = monthly_amount,
    days = COALESCE(duration, 12),
    days_paid = COALESCE(months_paid, 0),
    start_date = start_month
WHERE (daily_amount = 0 OR daily_amount IS NULL) AND monthly_amount IS NOT NULL;


-- =====================================================================
-- 4. incentive_credits (daily credit ledger + idempotency)
-- =====================================================================
CREATE TABLE IF NOT EXISTS incentive_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT NOT NULL,
  user_id INT NOT NULL,
  payout_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cycle_date (cycle_id, payout_date),
  INDEX idx_user_date (user_id, payout_date),
  UNIQUE KEY unique_cycle_payout_date (cycle_id, payout_date)
) ENGINE=InnoDB;


-- =====================================================================
-- 5. salary_payouts -> withdrawal payouts
-- =====================================================================
-- cycle_id nullable (NULL = withdrawal/aggregate row)
SET @s = (SELECT IF((SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payouts' AND COLUMN_NAME='cycle_id')='NO',
  'ALTER TABLE salary_payouts MODIFY COLUMN cycle_id INT NULL','SELECT 1'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- month / year nullable
SET @s = (SELECT IF((SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payouts' AND COLUMN_NAME='month')='NO',
  'ALTER TABLE salary_payouts MODIFY COLUMN month INT NULL','SELECT 1'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @s = (SELECT IF((SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payouts' AND COLUMN_NAME='year')='NO',
  'ALTER TABLE salary_payouts MODIFY COLUMN year INT NULL','SELECT 1'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- payout_date column
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payouts' AND COLUMN_NAME='payout_date')>0,
  'SELECT 1','ALTER TABLE salary_payouts ADD COLUMN payout_date DATE NULL AFTER year'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- Drop legacy unique_cycle_month index (incompatible with nullable cycle_id)
SET @s = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_payouts' AND INDEX_NAME='unique_cycle_month')>0,
  'ALTER TABLE salary_payouts DROP INDEX unique_cycle_month','SELECT 1'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;


-- =====================================================================
-- 6. wallet_transactions.type enum +incentive +withdrawal
-- =====================================================================
SET @s = (SELECT IF((SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND COLUMN_NAME='type') LIKE '%incentive%',
  'SELECT 1',
  'ALTER TABLE wallet_transactions MODIFY COLUMN type ENUM(''deposit'',''purchase'',''refund'',''bonus'',''incentive'',''withdrawal'') NOT NULL'));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;


-- =====================================================================
-- 7. orders.status enum +failed + backfill
-- =====================================================================
SET @s = (SELECT IF((SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='status') LIKE '%failed%',
  'SELECT 1',
  'ALTER TABLE orders MODIFY COLUMN status ENUM(''pending'',''processing'',''shipped'',''delivered'',''cancelled'',''failed'') DEFAULT ''pending'''));
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE orders SET status='failed' WHERE status='' OR status IS NULL;


-- =====================================================================
-- 8. settings: drop legacy, add new
-- =====================================================================
DELETE FROM settings
 WHERE setting_key IN ('closing_day','salary_amount','salary_duration');

INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('min_payout_amount',  '500',       'Minimum earning-wallet balance to auto-generate a withdrawal payout'),
  ('default_daily_amount','50',       'Default daily incentive per product'),
  ('default_days',       '15',        'Default incentive days per product'),
  ('payout_day',         '1',         'Day of week withdrawals are generated (0=Sun..6=Sat, 1=Monday)'),
  ('last_payout_date',   '1970-01-01','Last date a weekly payout sweep ran (idempotency marker)')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description);


-- =====================================================================
-- 9. salary_summary view (daily liability)
-- =====================================================================
CREATE OR REPLACE VIEW salary_summary AS
SELECT
  sc.sponsor_id,
  u.name AS sponsor_name,
  COUNT(sc.id) AS total_cycles,
  SUM(CASE WHEN sc.status='active'    THEN 1 ELSE 0 END) AS active_cycles,
  SUM(CASE WHEN sc.status='paused'    THEN 1 ELSE 0 END) AS paused_cycles,
  SUM(CASE WHEN sc.status='completed' THEN 1 ELSE 0 END) AS completed_cycles,
  COALESCE(SUM(
    CASE WHEN sc.days > 0
      THEN (sc.days - sc.days_paid) * sc.daily_amount
      ELSE (sc.duration - sc.months_paid) * sc.monthly_amount
    END
  ), 0) AS remaining_liability
FROM salary_cycles sc
JOIN users u ON u.id = sc.sponsor_id
GROUP BY sc.sponsor_id;

-- =====================================================================
-- Done. Verify with:
--   SHOW COLUMNS FROM wallets LIKE 'earnings_balance';
--   SHOW COLUMNS FROM products LIKE 'daily_amount';
--   SHOW COLUMNS FROM salary_cycles LIKE 'days_paid';
--   SHOW CREATE TABLE incentive_credits;
--   SELECT setting_key, setting_value FROM settings
--     WHERE setting_key IN ('payout_day','last_payout_date','min_payout_amount',
--                           'default_daily_amount','default_days');
-- =====================================================================