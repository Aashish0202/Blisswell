const pool = require('../config/db');

const User = {
  // Create new user
  async create(userData) {
    const { name, email, mobile, state, password, pan_number, referral_code, referred_by } = userData;
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, mobile, state, password, pan_number, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, mobile, state || null, password, pan_number, referral_code, referred_by || null]
    );
    return result.insertId;
  },

  // Find user by email
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  // Find user by ID
  async findById(id) {
    console.log(id);
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Find user by referral code
  async findByReferralCode(code) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE referral_code = ?',
      [code]
    );
    return rows[0];
  },

  // Find user by PAN
  async findByPAN(pan_number) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE pan_number = ?',
      [pan_number]
    );
    return rows[0];
  },

  // Find user by mobile
  async findByMobile(mobile) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE mobile = ?',
      [mobile]
    );
    return rows[0];
  },

  // Get all users (with pagination)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, name, email, mobile, pan_number, pan_status, referral_code, is_active, has_active_package, created_at FROM users WHERE 1=1';
    const params = [];

    if (filters.status !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.status);
    }
    if (filters.pan_status) {
      query += ' AND pan_status = ?';
      params.push(filters.pan_status);
    }
    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Count users
  async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (filters.status !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.status);
    }
    if (filters.pan_status) {
      query += ' AND pan_status = ?';
      params.push(filters.pan_status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Update user
  async update(id, userData) {
    const fields = [];
    const values = [];

    Object.keys(userData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(userData[key]);
    });

    values.push(id);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Update password
  async updatePassword(id, password) {
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [password, id]
    );
  },

  // Approve PAN
  async approvePAN(id) {
    await pool.execute(
      'UPDATE users SET pan_status = ? WHERE id = ?',
      ['approved', id]
    );
  },

  // Block/Unblock user
  async toggleStatus(id, status) {
    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [status, id]
    );
  },

  // Get referrals by user ID with business and bonus info
  async getReferrals(userId) {
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.has_active_package,
        u.created_at,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.amount ELSE 0 END), 0) as total_purchase,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.amount ELSE 0 END), 0) as direct_business
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.referred_by = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Get referrals with bonus earned from each
  async getReferralsWithBonus(userId) {
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.has_active_package,
        u.created_at,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.amount ELSE 0 END), 0) as total_purchase,
        (SELECT COALESCE(SUM(sp.amount), 0)
         FROM salary_payouts sp
         JOIN salary_cycles sc ON sp.cycle_id = sc.id
         WHERE sc.sponsor_id = ? AND sc.referral_id = u.id AND sp.status = 'paid') as bonus_received
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.referred_by = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [userId, userId]
    );
    return rows;
  },

  // Count active referrals
  async countActiveReferrals(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM users
       WHERE referred_by = ? AND has_active_package = TRUE`,
      [userId]
    );
    return rows[0].count;
  },

  // Check if user has active package
  async hasActivePackage(userId) {
    const [rows] = await pool.execute(
      'SELECT has_active_package FROM users WHERE id = ?',
      [userId]
    );
    return rows[0]?.has_active_package || false;
  },

  // Set active package
  async setActivePackage(userId, status) {
    await pool.execute(
      'UPDATE users SET has_active_package = ? WHERE id = ?',
      [status, userId]
    );
  },

  // Search users by name, email, mobile, or referral_code
  async search(query) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, mobile, referral_code, pan_status, has_active_package, is_active, created_at
       FROM users
       WHERE name LIKE ? OR email LIKE ? OR mobile LIKE ? OR referral_code LIKE ?
       ORDER BY name ASC
       LIMIT 20`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows;
  }
};

module.exports = User;