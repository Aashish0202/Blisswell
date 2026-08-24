const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('Running migration: Add youtube_link column to products table...');

    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
    `);

    const columnNames = columns.map(col => col.COLUMN_NAME);

    // Add images column if not exists (prerequisite for youtube_link placement)
    if (!columnNames.includes('images')) {
      console.log('Adding images column (prerequisite)...');
      await pool.execute(`
        ALTER TABLE products
        ADD COLUMN images TEXT DEFAULT NULL AFTER image
      `);
      console.log('images column added successfully');
    } else {
      console.log('images column already exists');
    }

    // Add youtube_link if not exists
    if (!columnNames.includes('youtube_link')) {
      console.log('Adding youtube_link column...');
      await pool.execute(`
        ALTER TABLE products
        ADD COLUMN youtube_link VARCHAR(500) DEFAULT NULL AFTER images
      `);
      console.log('youtube_link column added successfully');
    } else {
      console.log('youtube_link column already exists');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();