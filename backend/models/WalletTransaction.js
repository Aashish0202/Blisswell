const pool = require('../config/db');

const WalletTransaction = {
  // Create transaction. Supports the new income columns:
  //   level, source_user_id, reference_key (UNIQUE → idempotent).
  async create(data, connection = pool) {
    const { user_id, type, amount, payment_id, order_id, status, description, level, source_user_id, reference_key } = data;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, level, source_user_id, payment_id, order_id, status, reference_key, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        type,
        amount,
        level != null ? level : null,
        source_user_id != null ? source_user_id : null,
        payment_id || null,
        order_id || null,
        status || 'completed',
        reference_key || null,
        description || null
      ]
    );
    return result.insertId;
  },

  // Look up a transaction by its idempotency reference key.
  async getByReferenceKey(referenceKey, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT * FROM wallet_transactions WHERE reference_key = ?',
      [referenceKey]
    );
    return rows[0];
  },

  // Lifetime milestone reward income (Bike/Car Fund) for one user.
  async sumRewards(userId, connection = pool) {
    const [[row]] = await connection.execute(
      "SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions WHERE user_id = ? AND type = 'reward' AND status = 'completed'",
      [userId]
    );
    return parseFloat(row.total) || 0;
  },

  // Get transactions by user ID
  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT * FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Count transactions by user (for pagination)
  async countByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = ?`,
      [userId]
    );
    return rows[0].count;
  },

  // Lifetime totals for the wallet page stat cards, computed across ALL
  // history (not just the current page) and from completed transactions
  // only — failed payment attempts never inflate the numbers.
  async getLifetimeStats(userId) {
    const [rows] = await pool.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN amount > 0 AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) AS total_withdrawn,
        COALESCE(SUM(CASE WHEN type IN ('purchase', 'repurchase') AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN type = 'reward' AND status = 'completed' THEN amount ELSE 0 END), 0) AS reward_income
       FROM wallet_transactions
       WHERE user_id = ?`,
      [userId]
    );
    const r = rows[0] || {};
    return {
      total_earned: parseFloat(r.total_earned) || 0,
      total_withdrawn: parseFloat(r.total_withdrawn) || 0,
      total_spent: parseFloat(r.total_spent) || 0,
      reward_income: parseFloat(r.reward_income) || 0
    };
  },

  // Get transaction by ID
  async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Get transaction by payment ID
  async getByPaymentId(paymentId) {
    const [rows] = await pool.execute(
      'SELECT * FROM wallet_transactions WHERE payment_id = ?',
      [paymentId]
    );
    return rows[0];
  },

  // Update transaction status
  async updateStatus(id, status) {
    await pool.execute(
      'UPDATE wallet_transactions SET status = ? WHERE id = ?',
      [status, id]
    );
  },

  // Get all transactions (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT wt.*, u.name, u.email
      FROM wallet_transactions wt
      JOIN users u ON wt.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.type) {
      query += ' AND wt.type = ?';
      params.push(filters.type);
    }
    if (filters.status) {
      query += ' AND wt.status = ?';
      params.push(filters.status);
    }
    if (filters.user_id) {
      query += ' AND wt.user_id = ?';
      params.push(filters.user_id);
    }

    query += ' ORDER BY wt.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Count transactions
  async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM wallet_transactions WHERE 1=1';
    const params = [];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  }
};

module.exports = WalletTransaction;