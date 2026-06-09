const pool = require('./config/db');

async function addColumn() {
  try {
    console.log('Adding gst_number column to users table...');

    await pool.execute(
      'ALTER TABLE users ADD COLUMN gst_number VARCHAR(15) DEFAULT NULL AFTER pan_number'
    );

    console.log('✓ GST column added successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ Column gst_number already exists');
      process.exit(0);
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

addColumn();