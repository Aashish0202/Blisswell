const pool = require('../config/db');
const { PAID_ORDER_STATUSES } = require('./orderStatus');

// Downline depth for team queries: 1..10 (the admin "Max Levels" setting).
// Always an integer, so it is safe to inline into the recursive CTEs.
const clampDepth = (n) => Math.min(10, Math.max(1, parseInt(n, 10) || 10));

const User = {
  // Create new user
  async create(userData) {
    const { name, email, mobile, state, address, pincode, password, pan_number, referral_code, referred_by } = userData;
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, mobile, state, address, pincode, password, pan_number, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, mobile, state || null, address || null, pincode || null, password, pan_number, referral_code, referred_by || null]
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
    let query = 'SELECT id, name, email, mobile, pan_number, pan_status, gst_number, referral_code, is_active, has_active_package, created_at FROM users WHERE 1=1';
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
      query += ' AND (name LIKE ? OR email LIKE ? OR mobile LIKE ? OR referral_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
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

  // Update password with reset token
  async updatePasswordWithToken(id, password, resetToken, resetTokenExpires) {
    await pool.execute(
      'UPDATE users SET password = ?, reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [password, resetToken, resetTokenExpires, id]
    );
  },

  // Set reset token
  async setResetToken(email, resetToken, resetTokenExpires) {
    // resetTokenExpires is already in IST format (YYYY-MM-DD HH:MM:SS)
    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [resetToken, resetTokenExpires, email]
    );
  },

  // Find user by reset token
  async findByResetToken(token) {
    // Get current time in UTC format (same format as stored in database)
    const now = new Date();
    const currentTimeUTC = now.toISOString().slice(0, 19).replace('T', ' ');

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [token, currentTimeUTC]
    );
    return rows[0];
  },

  // Clear reset token
  async clearResetToken(id) {
    await pool.execute(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [id]
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
        COALESCE(SUM(CASE WHEN o.status IN (${PAID_ORDER_STATUSES}) THEN o.amount ELSE 0 END), 0) as total_purchase,
        COALESCE(SUM(CASE WHEN o.status IN (${PAID_ORDER_STATUSES}) THEN o.amount ELSE 0 END), 0) as direct_business
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.referred_by = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Get referrals with purchase info (direct referrals, paginated).
  // bonus_received removed (Business Bonus feature deleted).
  // email/mobile not selected — this feeds the user's own Team page.
  async getReferralsWithBonus(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.name,
        u.has_active_package,
        u.created_at,
        COALESCE(SUM(CASE WHEN o.status IN (${PAID_ORDER_STATUSES}) THEN o.amount ELSE 0 END), 0) as total_purchase,
        0 as bonus_received
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.referred_by = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Full 10-level downline tree (Team Income depth), with optional level
  // filter and name/referral_code search. Walks the
  // referred_by chain via a recursive CTE — MariaDB 10.2+ supports this.
  async getDownline(userId, { page = 1, limit = 20, level = null, search = '', maxLevels = 10 } = {}) {
    const offset = (page - 1) * limit;
    const depth = clampDepth(maxLevels);
    const params = [userId];
    let where = '1=1';

    if (level) {
      where += ' AND level = ?';
      params.push(level);
    }
    if (search) {
      // Search by name / referral code only — matching on email or mobile
      // would let a user probe whether a phone number is in their team.
      where += ' AND (name LIKE ? OR referral_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // email/mobile are not selected: team members' contact details are private.
    const cte = `
      WITH RECURSIVE downline AS (
        SELECT u.id, u.name, u.referral_code, u.has_active_package,
               u.rank_name, u.referred_by, u.created_at, 1 AS level,
               s.referral_code AS sponsor_code, s.name AS sponsor_name
        FROM users u
        JOIN users s ON s.id = u.referred_by
        WHERE u.referred_by = ?
        UNION ALL
        SELECT u.id, u.name, u.referral_code, u.has_active_package,
               u.rank_name, u.referred_by, u.created_at, d.level + 1,
               d.referral_code, d.name
        FROM users u
        JOIN downline d ON u.referred_by = d.id
        WHERE d.level < ${depth}
      )
    `;

    const [rows] = await pool.execute(
      `${cte} SELECT * FROM downline WHERE ${where}
       ORDER BY level ASC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `${cte} SELECT COUNT(*) AS total FROM downline WHERE ${where}`,
      params
    );

    const [levelCounts] = await pool.execute(
      `${cte} SELECT level, COUNT(*) AS count,
              SUM(CASE WHEN has_active_package = 1 THEN 1 ELSE 0 END) AS active_count
       FROM downline GROUP BY level ORDER BY level ASC`,
      [userId]
    );

    return { rows, total: parseInt(total, 10) || 0, levelCounts };
  },

  // Count total referrals (for pagination)
  async countReferrals(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM users WHERE referred_by = ?`,
      [userId]
    );
    return rows[0].count;
  },

  // Aggregated referral stats for the logged-in sponsor (used by the Referrals
  // page stat cards — correct across ALL referrals, not just the current page).
  // bonus_received replaced with qualified-direct count + team-income total.
  async getReferralSummary(userId, maxLevels = 10) {
    const depth = clampDepth(maxLevels);
    // Orders are pre-aggregated per user so a referral with several orders
    // is still counted once (a plain JOIN multiplied referral/active counts).
    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) as total_referrals,
        SUM(CASE WHEN u.has_active_package = 1 THEN 1 ELSE 0 END) as active_referrals,
        COALESCE(SUM(ob.amount), 0) as total_direct_business
       FROM users u
       LEFT JOIN (
         SELECT user_id, SUM(CASE WHEN status IN (${PAID_ORDER_STATUSES}) THEN amount ELSE 0 END) AS amount
         FROM orders GROUP BY user_id
       ) ob ON ob.user_id = u.id
       WHERE u.referred_by = ?`,
      [userId]
    );
    const r = rows[0] || {};

    const [ti] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM team_income_events WHERE upline_id = ?`,
      [userId]
    );
    const totalTeamIncome = parseFloat(ti[0].total) || 0;

    // Total business across the visible downline (admin Max Levels, not just
    // directs) — every purchase/repurchase order placed by anyone in it.
    const [[tb]] = await pool.execute(
      `WITH RECURSIVE downline AS (
        SELECT id, 1 AS level FROM users WHERE referred_by = ?
        UNION ALL
        SELECT u.id, d.level + 1 FROM users u
        JOIN downline d ON u.referred_by = d.id
        WHERE d.level < ${depth}
      )
      SELECT COALESCE(SUM(CASE WHEN o.status IN (${PAID_ORDER_STATUSES}) THEN o.amount ELSE 0 END), 0) as total
      FROM downline d
      LEFT JOIN orders o ON o.user_id = d.id`,
      [userId]
    );
    const totalTeamBusiness = parseFloat(tb.total) || 0;
    const team = await this.countTeam(userId, depth);

    return {
      max_levels: depth,
      total_referrals: parseInt(r.total_referrals) || 0,
      active_referrals: parseInt(r.active_referrals) || 0,
      team_total: team.total,
      team_active: team.active,
      total_direct_business: parseFloat(r.total_direct_business) || 0,
      total_team_business: totalTeamBusiness,
      total_team_income: totalTeamIncome,
      total_bonus_received: 0
    };
  },

  // Whole team (10-level downline, Team Income depth): total members and
  // how many of them have an active package.
  async countTeam(userId, maxLevels = 10) {
    const depth = clampDepth(maxLevels);
    const [[row]] = await pool.execute(
      `WITH RECURSIVE downline AS (
        SELECT id, has_active_package, 1 AS level FROM users WHERE referred_by = ?
        UNION ALL
        SELECT u.id, u.has_active_package, d.level + 1 FROM users u
        JOIN downline d ON u.referred_by = d.id
        WHERE d.level < ${depth}
      )
      SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN has_active_package = 1 THEN 1 ELSE 0 END), 0) AS active
      FROM downline`,
      [userId]
    );
    return { total: parseInt(row.total, 10) || 0, active: parseInt(row.active, 10) || 0 };
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
  },

  // -------------------------------------------------------------------
  // Team Income support — upline walk + qualified directs
  // -------------------------------------------------------------------

  // Walk up the referral chain via referred_by, returning upline users
  // ordered by level (1 = direct sponsor, 2 = sponsor's sponsor, ...).
  // maxDepth defaults to 10 (the Team Income level cap). Cycle-guarded.
  async getUpline(userId, maxDepth = 10, connection = pool) {
    const conn = connection;
    const upline = [];
    const visited = new Set([parseInt(userId, 10)]);

    // Seed with the purchaser's own sponsor pointer — one query to start the
    // walk, then exactly one query per level (the parent row itself carries
    // its referred_by pointer for the next hop).
    const [startRows] = await conn.execute(
      'SELECT referred_by FROM users WHERE id = ?',
      [userId]
    );
    let current = startRows[0] ? parseInt(startRows[0].referred_by, 10) : NaN;

    for (let level = 1; level <= maxDepth; level++) {
      if (!current || visited.has(current)) break; // end of chain / cycle guard
      visited.add(current);
      const [parent] = await conn.execute(
        `SELECT id, referred_by, name, email, referral_code, has_active_package FROM users WHERE id = ?`,
        [current]
      );
      if (!parent[0]) break;
      upline.push({ level, ...parent[0] });
      current = parent[0].referred_by != null ? parseInt(parent[0].referred_by, 10) : NaN;
    }
    return upline;
  },

  // Count a user's qualified directs (active package = 1).
  // Connection-aware so it sees the in-transaction purchaser.
  async countQualifiedDirects(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT COUNT(*) as count FROM users
       WHERE referred_by = ? AND has_active_package = 1`,
      [userId]
    );
    return parseInt(rows[0].count, 10) || 0;
  },

  // A user is "qualified" themselves when they have an active package.
  async isQualified(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT has_active_package FROM users WHERE id = ?`,
      [userId]
    );
    return Boolean(rows[0]?.has_active_package);
  },

  // Set the user's rank + current product (initial purchase or auto upgrade).
  // Connection-aware so it runs inside purchase/repurchase transactions.
  async updateRank(userId, { rank_name, product_id }, connection = pool) {
    const conn = connection;
    const [result] = await conn.execute(
      `UPDATE users SET rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?`,
      [rank_name || null, product_id || null, userId]
    );
    return result.affectedRows > 0;
  },

  // The user's current rank product (join for rank/price/level table).
  async getCurrentProduct(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT p.* FROM users u
       JOIN products p ON p.id = u.current_product_id
       WHERE u.id = ?`,
      [userId]
    );
    return rows[0] || null;
  }
};

module.exports = User;