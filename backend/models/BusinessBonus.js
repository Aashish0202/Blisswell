const pool = require('../config/db');

const BusinessBonus = {
  // Get or create bonus record for user
  async getOrCreate(userId) {
    // Try to get existing
    const [existing] = await pool.execute(
      'SELECT * FROM business_bonuses WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new
    await pool.execute(
      'INSERT INTO business_bonuses (user_id) VALUES (?)',
      [userId]
    );

    const [newRecord] = await pool.execute(
      'SELECT * FROM business_bonuses WHERE user_id = ?',
      [userId]
    );
    return newRecord[0];
  },

  // Calculate and update direct business for a user
  async updateDirectBusiness(userId) {
    // Get total direct business (sum of all direct referrals' purchases)
    const [result] = await pool.execute(`
      SELECT COALESCE(SUM(o.amount), 0) as total_business
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE u.referred_by = ? AND o.status != 'cancelled'
    `, [userId]);

    const totalBusiness = parseFloat(result[0].total_business) || 0;
    const bonusRecord = await this.getOrCreate(userId);

    // Calculate new milestones (every 50000)
    const BONUS_THRESHOLD = 50000;
    const BONUS_AMOUNT = 3000;

    const currentMilestone = Math.floor(totalBusiness / BONUS_THRESHOLD) * BONUS_THRESHOLD;
    const lastMilestone = parseFloat(bonusRecord.last_milestone) || 0;

    // Calculate new bonuses to add
    const newMilestones = currentMilestone - lastMilestone;
    const newBonuses = Math.floor(newMilestones / BONUS_THRESHOLD);

    if (newBonuses > 0) {
      // Create bonus payout records
      for (let i = 0; i < newBonuses; i++) {
        const milestoneAmount = lastMilestone + ((i + 1) * BONUS_THRESHOLD);
        await pool.execute(`
          INSERT INTO bonus_payouts (user_id, amount, milestone_amount, status)
          VALUES (?, ?, ?, 'pending')
        `, [userId, BONUS_AMOUNT, milestoneAmount]);
      }

      // Update bonus record
      const totalBonus = parseFloat(bonusRecord.bonus_earned) + (newBonuses * BONUS_AMOUNT);
      await pool.execute(`
        UPDATE business_bonuses
        SET total_direct_business = ?, bonus_earned = ?, last_milestone = ?
        WHERE user_id = ?
      `, [totalBusiness, totalBonus, currentMilestone, userId]);
    } else {
      // Just update the business total
      await pool.execute(`
        UPDATE business_bonuses SET total_direct_business = ? WHERE user_id = ?
      `, [totalBusiness, userId]);
    }

    return await this.getOrCreate(userId);
  },

  // Get all bonus records with user details
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;

    let query = `
      SELECT bb.*, u.name, u.email, u.mobile, u.referral_code, u.pan_status, k.kyc_status,
        COALESCE(SUM(CASE WHEN bp.status = 'pending' THEN bp.amount ELSE 0 END), 0) as pending_bonus,
        COALESCE(SUM(CASE WHEN bp.status = 'paid' THEN bp.amount ELSE 0 END), 0) as paid_bonus
      FROM business_bonuses bb
      JOIN users u ON bb.user_id = u.id
      LEFT JOIN user_kyc k ON u.id = k.user_id
      LEFT JOIN bonus_payouts bp ON bb.user_id = bp.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.referral_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' GROUP BY bb.id ORDER BY bb.total_direct_business DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Count bonus records
  async count(filters = {}) {
    let query = 'SELECT COUNT(DISTINCT bb.user_id) as total FROM business_bonuses bb JOIN users u ON bb.user_id = u.id WHERE 1=1';
    const params = [];

    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.referral_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Get bonus payouts for a user
  async getPayouts(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(`
      SELECT bp.*, u.name, u.email, u.referral_code
      FROM bonus_payouts bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.user_id = ?
      ORDER BY bp.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    return rows;
  },

  // Get all pending bonus payouts
  async getAllPayouts(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;

    let query = `
      SELECT bp.*, u.name, u.email, u.mobile, u.referral_code, u.pan_status,
        k.bank_name, k.account_number, k.ifsc_code, k.branch_name, k.kyc_status,
        CASE
          WHEN u.pan_status = 'approved' AND k.kyc_status = 'approved' THEN 'complete'
          ELSE 'incomplete'
        END as verification_status
      FROM bonus_payouts bp
      JOIN users u ON bp.user_id = u.id
      LEFT JOIN user_kyc k ON u.id = k.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND bp.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY bp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Update payout status
  async updatePayoutStatus(payoutId, status) {
    const paidAt = status === 'paid' ? new Date() : null;
    await pool.execute(
      'UPDATE bonus_payouts SET status = ?, paid_at = ? WHERE id = ?',
      [status, paidAt, payoutId]
    );
  },

  // Get summary stats
  async getSummary() {
    const [rows] = await pool.execute(`
      SELECT
        COUNT(DISTINCT bb.user_id) as total_users,
        COALESCE(SUM(bb.total_direct_business), 0) as total_business,
        COALESCE(SUM(bb.bonus_earned), 0) as total_bonus_earned,
        (SELECT COALESCE(SUM(amount), 0) FROM bonus_payouts WHERE status = 'pending') as pending_bonus,
        (SELECT COALESCE(SUM(amount), 0) FROM bonus_payouts WHERE status = 'paid') as paid_bonus
      FROM business_bonuses bb
    `);
    return rows[0];
  },

  // Recalculate all users' direct business
  async recalculateAll() {
    // Get all users who have referrals
    const [users] = await pool.execute(`
      SELECT DISTINCT referred_by as user_id
      FROM users
      WHERE referred_by IS NOT NULL
    `);

    for (const user of users) {
      await this.updateDirectBusiness(user.user_id);
    }

    return users.length;
  }
};

module.exports = BusinessBonus;