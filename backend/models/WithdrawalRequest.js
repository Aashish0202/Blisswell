const pool = require('../config/db');

// User-initiated withdrawal requests.
// Status flow: pending → processed | rejected → (reversed).
// UNIQUE(reference_key) keeps the request + its wallet transaction idempotent.
const WithdrawalRequest = {
  async create(data, connection = pool) {
    const conn = connection;
    const { user_id, amount, reference_key, transaction_id } = data;
    const [result] = await conn.execute(
      `INSERT INTO withdrawal_requests
       (user_id, amount, status, reference_key, transaction_id)
       VALUES (?, ?, 'pending', ?, ?)`,
      [user_id, amount, reference_key, transaction_id || null]
    );
    return result.insertId;
  },

  async hasPending(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT id FROM withdrawal_requests
       WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );
    return rows.length > 0;
  },

  async getById(id, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT wr.*, u.name, u.email, u.mobile, u.referral_code, u.pan_number, u.pan_status,
             k.bank_name, k.account_number, k.ifsc_code, k.branch_name,
             k.nominee_name, k.nominee_relation, k.kyc_status
       FROM withdrawal_requests wr
       JOIN users u ON wr.user_id = u.id
      LEFT JOIN user_kyc k ON k.id = (SELECT MAX(id) FROM user_kyc WHERE user_id = u.id)
       WHERE wr.id = ?`,
      [id]
    );
    return rows[0];
  },

  async getByUser(userId, page = 1, limit = 20, connection = pool) {
    const conn = connection;
    const offset = (page - 1) * limit;
    const [rows] = await conn.execute(
      `SELECT * FROM withdrawal_requests WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  async countByUser(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT COUNT(*) as count FROM withdrawal_requests WHERE user_id = ?',
      [userId]
    );
    return rows[0].count;
  },

  // Admin list with optional status filter.
  async getAll(page = 1, limit = 20, filters = {}, connection = pool) {
    const conn = connection;
    const offset = (page - 1) * limit;
    let query = `
      SELECT wr.*, u.name, u.email, u.mobile, u.referral_code, u.pan_number, u.pan_status,
             k.bank_name, k.account_number, k.ifsc_code, k.branch_name,
             k.nominee_name, k.nominee_relation, k.kyc_status
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      LEFT JOIN user_kyc k ON k.id = (SELECT MAX(id) FROM user_kyc WHERE user_id = u.id)
      WHERE 1=1
    `;
    const params = [];
    if (filters.status) {
      query += ' AND wr.status = ?';
      params.push(filters.status);
    }
    query += ' ORDER BY wr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await conn.execute(query, params);
    return rows;
  },

  async countAll(filters = {}, connection = pool) {
    const conn = connection;
    let query = 'SELECT COUNT(*) as total FROM withdrawal_requests WHERE 1=1';
    const params = [];
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    const [rows] = await conn.execute(query, params);
    return rows[0].total;
  },

  // Generic status update. `fields` may include processed_by, processed_at,
  // reject_reason, reversal_transaction_id, transaction_id, and the split
  // ledger columns admin_charge / repurchase_amount / payout_amount.
  async updateStatus(id, status, fields = {}, connection = pool) {
    const conn = connection;
    const sets = ['status = ?'];
    const values = [status];
    if (fields.transaction_id !== undefined) { sets.push('transaction_id = ?'); values.push(fields.transaction_id); }
    if (fields.reversal_transaction_id !== undefined) { sets.push('reversal_transaction_id = ?'); values.push(fields.reversal_transaction_id); }
    if (fields.processed_by !== undefined) { sets.push('processed_by = ?'); values.push(fields.processed_by); }
    if (fields.processed_at !== undefined) { sets.push('processed_at = ?'); values.push(fields.processed_at); }
    if (fields.reject_reason !== undefined) { sets.push('reject_reason = ?'); values.push(fields.reject_reason); }
    if (fields.admin_charge !== undefined) { sets.push('admin_charge = ?'); values.push(fields.admin_charge); }
    if (fields.repurchase_amount !== undefined) { sets.push('repurchase_amount = ?'); values.push(fields.repurchase_amount); }
    if (fields.payout_amount !== undefined) { sets.push('payout_amount = ?'); values.push(fields.payout_amount); }
    values.push(id);
    const [result] = await conn.execute(
      `UPDATE withdrawal_requests SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }
};

module.exports = WithdrawalRequest;