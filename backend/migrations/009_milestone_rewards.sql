-- 009 — Milestone Rewards: Bike Fund (3x3) / Car Fund (5x5)
-- Reference SQL for production. The same schema + seed is applied
-- idempotently at boot by models/RewardPlan.ensureSchema(), so running this
-- by hand is optional. Safe to re-run.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS reward_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  matrix_label VARCHAR(20) NOT NULL,
  icon VARCHAR(20) NOT NULL DEFAULT 'gift',
  required_counts LONGTEXT NOT NULL,            -- JSON [L1..L6]
  reward_amount DECIMAL(12,2) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reward_plans_seq (is_active, sequence_order)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_reward_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_plan_id INT NOT NULL,
  level_counts LONGTEXT NOT NULL,               -- JSON [L1..L6] active counts
  progress_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  status ENUM('LOCKED','IN_PROGRESS','ACHIEVED','PAID') NOT NULL DEFAULT 'IN_PROGRESS',
  reward_amount DECIMAL(12,2) NULL,             -- amount actually paid (snapshot)
  achieved_at DATETIME NULL,
  paid_at DATETIME NULL,
  transaction_id INT NULL,                      -- wallet_transactions.id
  last_computed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_reward (user_id, reward_plan_id),
  INDEX idx_urp_plan_status (reward_plan_id, status),
  INDEX idx_urp_status_achieved (status, achieved_at)
) DEFAULT CHARSET=utf8mb4;

-- Add 'reward' to wallet_transactions.type.
-- !! Check the current enum first on prod (SHOW COLUMNS FROM wallet_transactions LIKE 'type')
-- and keep every existing value. ensureSchema() does this automatically.
ALTER TABLE wallet_transactions MODIFY type
  ENUM('deposit','purchase','refund','bonus','incentive','self_cashback','team_income',
       'withdrawal','withdrawal_reversal','repurchase','reward') NOT NULL;

-- Seed (only when empty)
INSERT INTO reward_plans (name, matrix_label, icon, required_counts, reward_amount, sequence_order, is_active)
SELECT * FROM (
  SELECT 'Bike Fund' AS name, '3x3' AS matrix_label, 'bike' AS icon, '[3,9,27,81,243,729]' AS rc, 100000.00 AS amt, 1 AS seq, 1 AS act
  UNION ALL
  SELECT 'Car Fund', '5x5', 'car', '[5,25,125,625,3125,15625]', 900000.00, 2, 1
) s
WHERE NOT EXISTS (SELECT 1 FROM reward_plans);
