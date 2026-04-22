-- Create database
CREATE DATABASE IF NOT EXISTS blisswell;
USE blisswell;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  pan_number VARCHAR(10) UNIQUE,
  pan_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  referred_by INT,
  has_active_package BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_referral_code (referral_code),
  INDEX idx_pan (pan_number)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('deposit', 'purchase', 'refund', 'bonus') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_id VARCHAR(100),
  order_id VARCHAR(100),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_payment_id (payment_id),
  INDEX idx_created_at (created_at)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  image VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  payment_type ENUM('wallet', 'razorpay') DEFAULT 'wallet',
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Salary cycles table
CREATE TABLE IF NOT EXISTS salary_cycles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sponsor_id INT NOT NULL,
  referral_id INT NOT NULL,
  start_month DATE NOT NULL,
  monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 100.00,
  duration INT DEFAULT 12,
  months_paid INT DEFAULT 0,
  status ENUM('active', 'paused', 'completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sponsor_id (sponsor_id),
  INDEX idx_status (status),
  INDEX idx_referral_id (referral_id)
);

-- Salary payouts table
CREATE TABLE IF NOT EXISTS salary_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT NOT NULL,
  user_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_month_year (month, year),
  INDEX idx_paid_at (paid_at),
  UNIQUE KEY unique_cycle_month (cycle_id, month, year)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- CMS table for content management
CREATE TABLE IF NOT EXISTS cms_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255),
  content TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_page_name (page_name)
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  position ENUM('home_top', 'home_middle', 'home_bottom') DEFAULT 'home_top',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_position (position)
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('package_price', '2100', 'Default package price'),
('salary_amount', '100', 'Monthly salary amount per referral'),
('salary_duration', '12', 'Number of months for salary payout'),
('closing_day', '5', 'Day of month for salary closing'),
('repurchase_enabled', 'true', 'Allow repurchase of package')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert default product
INSERT INTO products (name, description, price, is_active) VALUES
('Premium Bedsheet', 'High quality premium bedsheets with elegant designs. Includes 1 bedsheet and 2 pillow covers.', 2100.00, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default admin user (password: admin123)
-- Note: Change this password immediately after first login
INSERT INTO users (name, email, mobile, password, pan_number, pan_status, referral_code, role, is_active) VALUES
('Admin', 'admin@blisswell.com', '9999999999', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AAAAA0000A', 'approved', 'ADMIN001', 'admin', TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Create view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id,
  u.name,
  u.email,
  u.has_active_package,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.has_active_package THEN r.id END) as active_referrals,
  w.balance as wallet_balance
FROM users u
LEFT JOIN users r ON r.referred_by = u.id
LEFT JOIN wallets w ON w.user_id = u.id
GROUP BY u.id;

-- Create view for salary summary
CREATE OR REPLACE VIEW salary_summary AS
SELECT
  sc.sponsor_id,
  u.name as sponsor_name,
  COUNT(sc.id) as total_cycles,
  SUM(CASE WHEN sc.status = 'active' THEN 1 ELSE 0 END) as active_cycles,
  SUM(CASE WHEN sc.status = 'paused' THEN 1 ELSE 0 END) as paused_cycles,
  SUM(CASE WHEN sc.status = 'completed' THEN 1 ELSE 0 END) as completed_cycles,
  SUM((sc.duration - sc.months_paid) * sc.monthly_amount) as remaining_liability
FROM salary_cycles sc
JOIN users u ON u.id = sc.sponsor_id
GROUP BY sc.sponsor_id;