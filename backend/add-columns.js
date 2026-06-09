const pool = require('./config/db');

async function addColumns() {
  console.log('Starting database migration...\n');

  // Add gst_number column
  try {
    console.log('Adding gst_number column...');
    await pool.execute('ALTER TABLE users ADD COLUMN gst_number VARCHAR(15) DEFAULT NULL AFTER pan_number');
    console.log('✓ gst_number column added successfully\n');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ gst_number column already exists\n');
    } else {
      console.error('Error adding gst_number:', e.message);
    }
  }

  // Add gst_status column
  try {
    console.log('Adding gst_status column...');
    await pool.execute("ALTER TABLE users ADD COLUMN gst_status ENUM('pending', 'approved') DEFAULT NULL AFTER gst_number");
    console.log('✓ gst_status column added successfully\n');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ gst_status column already exists\n');
    } else {
      console.error('Error adding gst_status:', e.message);
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

addColumns();