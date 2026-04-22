const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const referralCode = 'ADMIN' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, mobile, password, referral_code, role, is_active, pan_status)
       VALUES (?, ?, ?, ?, ?, 'admin', TRUE, 'approved')`,
      ['Admin', 'admin@blisswell.in', '9999999999', hashedPassword, referralCode]
    );

    // Create wallet for admin
    await pool.execute(
      'INSERT INTO wallets (user_id, balance) VALUES (?, 0)',
      [result.insertId]
    );

    console.log('Admin user created successfully!');
    console.log('Email: admin@blisswell.in');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('Admin user already exists. Updating password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.execute(
        'UPDATE users SET password = ?, role = ? WHERE email = ?',
        [hashedPassword, 'admin', 'admin@blisswell.in']
      );
      console.log('Admin password updated!');
      console.log('Email: admin@blisswell.in');
      console.log('Password: admin123');
      process.exit(0);
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

createAdmin();