const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    // First connect without database to create it
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL server');

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS blisswell');
    await connection.query('USE blisswell');
    console.log('✅ Database created/selected');

    // Create tables
    console.log('Creating tables...');

    // Users table
    await connection.query(`
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
        INDEX idx_referral_code (referral_code)
      )
    `);
    console.log('  ✓ users table');

    // Wallets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        balance DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ wallets table');

    // Wallet transactions table
    await connection.query(`
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ wallet_transactions table');

    // Products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(12,2) NOT NULL,
        salary_amount DECIMAL(12,2) DEFAULT 100.00,
        salary_duration INT DEFAULT 12,
        image VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ products table');

    // Orders table
    await connection.query(`
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
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ orders table');

    // Salary cycles table
    await connection.query(`
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
        FOREIGN KEY (referral_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ salary_cycles table');

    // Salary payouts table
    await connection.query(`
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
        UNIQUE KEY unique_cycle_month (cycle_id, month, year)
      )
    `);
    console.log('  ✓ salary_payouts table');

    // Settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ settings table');

    // Insert default settings
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, description) VALUES
      ('package_price', '2100', 'Default package price'),
      ('salary_amount', '100', 'Sales Incentive amount per referral'),
      ('salary_duration', '12', 'Number of months for salary payout'),
      ('closing_day', '5', 'Day of month for salary closing'),
      ('repurchase_enabled', 'true', 'Allow repurchase of package'),
      ('site_name', 'Blisswell', 'Site name'),
      ('site_logo', '', 'Site logo URL'),
      ('site_tagline', 'Premium Bedsheets', 'Site tagline')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
    console.log('  ✓ default settings inserted');

    // Insert default product
    await connection.query(`
      INSERT INTO products (name, description, price, salary_amount, salary_duration, is_active) VALUES
      ('Premium Bedsheet', 'High quality premium bedsheets with elegant designs. Includes 1 bedsheet and 2 pillow covers.', 2100.00, 100.00, 12, TRUE)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('  ✓ default product inserted');

    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await connection.query(`
      INSERT INTO users (name, email, mobile, password, pan_number, pan_status, referral_code, role, is_active) VALUES
      ('Admin', 'admin@blisswell.com', '9999999999', ?, 'AAAAA0000A', 'approved', 'ADMIN001', 'admin', TRUE)
      ON DUPLICATE KEY UPDATE email = VALUES(email)
    `, [hashedPassword]);
    console.log('  ✓ default admin user inserted (email: admin@blisswell.com, password: admin123)');

    // Migration: Add salary fields to products table if they don't exist
    try {
      // Check if salary_amount column exists
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'blisswell' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'salary_amount'
      `);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE products
          ADD COLUMN salary_amount DECIMAL(12,2) DEFAULT 100.00 AFTER price,
          ADD COLUMN salary_duration INT DEFAULT 12 AFTER salary_amount
        `);
        // Update existing products with default salary values
        await connection.query(`
          UPDATE products SET salary_amount = 100.00, salary_duration = 12 WHERE salary_amount IS NULL
        `);
        console.log('  ✓ migration: added salary fields to products table');
      }
    } catch (migrationError) {
      console.log('  ⚠ migration check skipped:', migrationError.message);
    }

    console.log('\n🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\nPlease make sure MySQL is running and accessible.');
    console.error('Connection details:');
    console.error('  Host:', process.env.DB_HOST || 'localhost');
    console.error('  User:', process.env.DB_USER || 'root');
    console.error('  Port:', process.env.DB_PORT || 3306);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();