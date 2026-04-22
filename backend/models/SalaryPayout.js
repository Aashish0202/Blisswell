const pool = require('../config/db');

const SalaryPayout = {
  // Create payout
  async create(payoutData, connection = pool) {
    const { cycle_id, user_id, month, year, amount, status } = payoutData;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO salary_payouts
       (cycle_id, user_id, month, year, amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cycle_id, user_id, month, year, amount, status || 'pending']
    );
    return result.insertId;
  },

  // Get payout by ID
  async getById(id) {
    const [rows] = await pool.execute(
      `SELECT sp.*, u.name as user_name, u.email as user_email, u.mobile as user_mobile,
        sc.referral_id, r.name as referral_name
       FROM salary_payouts sp
       JOIN users u ON sp.user_id = u.id
       JOIN salary_cycles sc ON sp.cycle_id = sc.id
       JOIN users r ON sc.referral_id = r.id
       WHERE sp.id = ?`,
      [id]
    );
    return rows[0];
  },

  // Get payouts by user ID
  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT sp.*, r.name as referral_name
       FROM salary_payouts sp
       JOIN salary_cycles sc ON sp.cycle_id = sc.id
       JOIN users r ON sc.referral_id = r.id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Get all payouts (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT sp.*, u.name as user_name, u.email as user_email, u.mobile as user_mobile,
        sc.referral_id, r.name as referral_name
      FROM salary_payouts sp
      JOIN users u ON sp.user_id = u.id
      JOIN salary_cycles sc ON sp.cycle_id = sc.id
      JOIN users r ON sc.referral_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND sp.status = ?';
      params.push(filters.status);
    }
    if (filters.user_id) {
      query += ' AND sp.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.month && filters.year) {
      query += ' AND sp.month = ? AND sp.year = ?';
      params.push(filters.month, filters.year);
    }

    query += ' ORDER BY sp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Update payout status
  async updateStatus(id, status, paidAt = null) {
    if (paidAt) {
      await pool.execute(
        'UPDATE salary_payouts SET status = ?, paid_at = ? WHERE id = ?',
        [status, paidAt, id]
      );
    } else {
      await pool.execute(
        'UPDATE salary_payouts SET status = ? WHERE id = ?',
        [status, id]
      );
    }
  },

  // Get pending payouts
  async getPending(page = 1, limit = 20) {
    return this.getAll(page, limit, { status: 'pending' });
  },

  // Count payouts by status
  async countByStatus(status = null) {
    let query = 'SELECT COUNT(*) as total FROM salary_payouts';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Get total payout amount by status
  async getTotalByStatus(status = null) {
    let query = 'SELECT SUM(amount) as total FROM salary_payouts';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total || 0;
  },

  // Get monthly summary
  async getMonthlySummary(year) {
    const [rows] = await pool.execute(
      `SELECT month,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount
       FROM salary_payouts
       WHERE year = ?
       GROUP BY month
       ORDER BY month`,
      [year]
    );
    return rows;
  },

  // Check if payout exists for cycle and month
  async getByCycleAndMonth(cycleId, month, year) {
    const [rows] = await pool.execute(
      'SELECT * FROM salary_payouts WHERE cycle_id = ? AND month = ? AND year = ?',
      [cycleId, month, year]
    );
    return rows[0];
  },

  // Get payouts for export
  async getForExport(filters = {}) {
    let query = `
      SELECT sp.*, u.name as user_name, u.email as user_email, u.mobile as user_mobile,
        u.pan_number, sc.referral_id, r.name as referral_name
      FROM salary_payouts sp
      JOIN users u ON sp.user_id = u.id
      JOIN salary_cycles sc ON sp.cycle_id = sc.id
      JOIN users r ON sc.referral_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND sp.status = ?';
      params.push(filters.status);
    }
    if (filters.month && filters.year) {
      query += ' AND sp.month = ? AND sp.year = ?';
      params.push(filters.month, filters.year);
    }

    query += ' ORDER BY sp.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
};

module.exports = SalaryPayout;