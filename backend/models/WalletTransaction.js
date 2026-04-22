const pool = require('../config/db');

const WalletTransaction = {
  // Create transaction
  async create(data, connection = pool) {
    const { user_id, type, amount, payment_id, order_id, status, description } = data;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, payment_id, order_id, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, type, amount, payment_id || null, order_id || null, status || 'completed', description || null]
    );
    return result.insertId;
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