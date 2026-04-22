const pool = require('../config/db');

async function migrate() {
  try {
    // Check if column exists
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'blisswell' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'state'"
    );

    if (columns.length === 0) {
      await pool.execute('ALTER TABLE users ADD COLUMN state VARCHAR(50) AFTER mobile');
      console.log('✅ Added state column to users table');
    } else {
      console.log('ℹ️ state column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

migrate();