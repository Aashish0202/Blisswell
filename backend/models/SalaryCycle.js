const pool = require('../config/db');

const SalaryCycle = {
  // Create salary cycle (daily incentive model)
  async create(cycleData, connection = pool) {
    const { sponsor_id, referral_id, start_date, daily_amount, days } = cycleData;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO salary_cycles
       (sponsor_id, referral_id, start_date, daily_amount, days, days_paid, status)
       VALUES (?, ?, ?, ?, ?, 0, 'active')`,
      [sponsor_id, referral_id, start_date, daily_amount, days || 12]
    );
    return result.insertId;
  },

  // Get cycle by ID
  async getById(id) {
    const [rows] = await pool.execute(
      `SELECT sc.*,
        s.name as sponsor_name, s.email as sponsor_email,
        r.name as referral_name, r.email as referral_email
       FROM salary_cycles sc
       JOIN users s ON sc.sponsor_id = s.id
       JOIN users r ON sc.referral_id = r.id
       WHERE sc.id = ?`,
      [id]
    );
    return rows[0];
  },

  // Get cycles by sponsor ID
  async getBySponsorId(sponsorId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT sc.*, r.name as referral_name, r.email as referral_email
       FROM salary_cycles sc
       JOIN users r ON sc.referral_id = r.id
       WHERE sc.sponsor_id = ?
       ORDER BY sc.created_at DESC
       LIMIT ? OFFSET ?`,
      [sponsorId, limit, offset]
    );
    return rows;
  },

  // Count cycles by sponsor (for pagination)
  async countBySponsor(sponsorId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM salary_cycles WHERE sponsor_id = ?`,
      [sponsorId]
    );
    return rows[0].count;
  },

  // Get all cycles (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT sc.*,
        s.name as sponsor_name, s.email as sponsor_email,
        r.name as referral_name, r.email as referral_email
      FROM salary_cycles sc
      JOIN users s ON sc.sponsor_id = s.id
      JOIN users r ON sc.referral_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND sc.status = ?';
      params.push(filters.status);
    }
    if (filters.sponsor_id) {
      query += ' AND sc.sponsor_id = ?';
      params.push(filters.sponsor_id);
    }

    query += ' ORDER BY sc.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Count all cycles (admin) matching filters (for pagination)
  async countAll(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM salary_cycles sc WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ' AND sc.status = ?';
      params.push(filters.status);
    }
    if (filters.sponsor_id) {
      query += ' AND sc.sponsor_id = ?';
      params.push(filters.sponsor_id);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].count;
  },

  // Get active cycles for daily processing
  async getActiveCyclesForProcessing() {
    const [rows] = await pool.execute(
      `SELECT sc.*, u.has_active_package as sponsor_active
       FROM salary_cycles sc
       JOIN users u ON sc.sponsor_id = u.id
       WHERE sc.status = 'active' AND sc.days_paid < sc.days`
    );
    return rows;
  },

  // Update cycle
  async update(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    });

    values.push(id);

    await pool.execute(
      `UPDATE salary_cycles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Increment months paid (legacy)
  async incrementMonthsPaid(id) {
    await pool.execute(
      'UPDATE salary_cycles SET months_paid = months_paid + 1 WHERE id = ?',
      [id]
    );
  },

  // Increment days paid (daily model)
  async incrementDaysPaid(id, connection = pool) {
    await connection.execute(
      'UPDATE salary_cycles SET days_paid = days_paid + 1 WHERE id = ?',
      [id]
    );
  },

  // Pause cycle
  async pause(id) {
    await pool.execute(
      "UPDATE salary_cycles SET status = 'paused' WHERE id = ?",
      [id]
    );
  },

  // Resume cycle
  async resume(id) {
    await pool.execute(
      "UPDATE salary_cycles SET status = 'active' WHERE id = ?",
      [id]
    );
  },

  // Complete cycle
  async complete(id) {
    await pool.execute(
      "UPDATE salary_cycles SET status = 'completed' WHERE id = ?",
      [id]
    );
  },

  // Count cycles by status
  async countByStatus(status = null) {
    let query = 'SELECT COUNT(*) as total FROM salary_cycles';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Get liability report (daily model)
  async getLiabilityReport() {
    const [rows] = await pool.execute(
      `SELECT
        status,
        COUNT(*) as cycle_count,
        SUM(days_paid) as total_days_paid,
        SUM(days - days_paid) as remaining_days,
        SUM((days - days_paid) * daily_amount) as remaining_liability
       FROM salary_cycles
       GROUP BY status`
    );
    return rows;
  },

  // Get total active liability (daily model)
  async getTotalActiveLiability() {
    const [rows] = await pool.execute(
      `SELECT SUM((days - days_paid) * daily_amount) as total_liability
       FROM salary_cycles
       WHERE status = 'active'`
    );
    return rows[0].total_liability || 0;
  },

  // Check if cycle exists for referral
  async getByReferralId(referralId) {
    const [rows] = await pool.execute(
      'SELECT * FROM salary_cycles WHERE referral_id = ?',
      [referralId]
    );
    return rows[0];
  }
};

module.exports = SalaryCycle;