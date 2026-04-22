const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('Running migration: Add salary columns to products table...');

    // Check if columns already exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
    `);

    const columnNames = columns.map(col => col.COLUMN_NAME);

    // Add salary_amount if not exists
    if (!columnNames.includes('salary_amount')) {
      console.log('Adding salary_amount column...');
      await pool.execute(`
        ALTER TABLE products
        ADD COLUMN salary_amount DECIMAL(12,2) DEFAULT 100.00 AFTER price
      `);
      console.log('salary_amount column added successfully');
    } else {
      console.log('salary_amount column already exists');
    }

    // Add salary_duration if not exists
    if (!columnNames.includes('salary_duration')) {
      console.log('Adding salary_duration column...');
      await pool.execute(`
        ALTER TABLE products
        ADD COLUMN salary_duration INT DEFAULT 12 AFTER salary_amount
      `);
      console.log('salary_duration column added successfully');
    } else {
      console.log('salary_duration column already exists');
    }

    // Update existing products with default values if they don't have them
    await pool.execute(`
      UPDATE products
      SET salary_amount = 100.00, salary_duration = 12
      WHERE salary_amount IS NULL OR salary_duration IS NULL
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();