const pool = require('../config/db');

// Daily incentive credit ledger. One row per cycle per day — the UNIQUE
// (cycle_id, payout_date) constraint makes the daily closing idempotent:
// if the cron re-runs or the server boots up and catch-up fires twice, the
// duplicate insert throws and that cycle is skipped for that date.
const IncentiveCredit = {
  // Create a daily credit record
  async create(data, connection = pool) {
    const { cycle_id, user_id, payout_date, amount } = data;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO incentive_credits (cycle_id, user_id, payout_date, amount)
       VALUES (?, ?, ?, ?)`,
      [cycle_id, user_id, payout_date, amount]
    );
    return result.insertId;
  },

  // Check if a credit already exists for a cycle on a given date (idempotency)
  async exists(cycleId, payoutDate, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT id FROM incentive_credits WHERE cycle_id = ? AND payout_date = ?',
      [cycleId, payoutDate]
    );
    return rows.length > 0;
  },

  // Get credits by user (for earnings history)
  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT ic.*, r.name as referral_name
       FROM incentive_credits ic
       JOIN salary_cycles sc ON ic.cycle_id = sc.id
       JOIN users r ON sc.referral_id = r.id
       WHERE ic.user_id = ?
       ORDER BY ic.payout_date DESC, ic.id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Total credited to a user (all-time)
  async getTotalByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as total FROM incentive_credits WHERE user_id = ?',
      [userId]
    );
    return rows[0].total;
  },

  // Last credited date for a cycle (used by boot catch-up)
  async getLastCreditDate(cycleId) {
    const [rows] = await pool.execute(
      'SELECT MAX(payout_date) as last_date FROM incentive_credits WHERE cycle_id = ?',
      [cycleId]
    );
    return rows[0]?.last_date || null;
  },

  // Summary for a date range (admin daily summary)
  async getDailySummary(date) {
    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) as credit_count,
        COALESCE(SUM(amount), 0) as total_credited
       FROM incentive_credits
       WHERE payout_date = ?`,
      [date]
    );
    return rows[0];
  }
};

module.exports = IncentiveCredit;