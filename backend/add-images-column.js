const mysql = require('mysql2/promise');
require('dotenv').config();

async function addImagesColumn() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Checking products table columns...');

  const [columns] = await conn.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'blisswell' AND TABLE_NAME = 'products'
  `);

  console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));

  // Check if images column exists
  const hasImages = columns.some(c => c.COLUMN_NAME === 'images');
  console.log('Has images column:', hasImages);

  if (!hasImages) {
    console.log('Adding images column...');
    await conn.execute('ALTER TABLE products ADD COLUMN images TEXT AFTER price');
    console.log('✅ images column added!');
  } else {
    console.log('✅ images column already exists');
  }

  await conn.end();
}

addImagesColumn().catch(console.error);