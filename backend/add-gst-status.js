const pool = require('./config/db');

async function addColumn() {
  try {
    console.log('Adding gst_status column to users table...');

    await pool.execute(
      'ALTER TABLE users ADD COLUMN gst_status ENUM("pending", "approved") DEFAULT NULL AFTER gst_number'
    );

    console.log('✓ GST status column added successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ Column gst_status already exists');
      process.exit(0);
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

addColumn();