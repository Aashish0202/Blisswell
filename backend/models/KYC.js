const pool = require('../config/db');

const KYC = {
  // Get KYC by user ID
  async getByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM user_kyc WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  },

  // Get KYC by ID
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM user_kyc WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Create or Update KYC (upsert)
  async upsert(userId, kycData) {
    const { bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation } = kycData;

    // Check if KYC already exists
    const existing = await this.getByUserId(userId);

    if (existing) {
      // Update existing KYC (only if pending or rejected)
      if (existing.kyc_status === 'approved') {
        throw new Error('KYC already approved. Contact admin for changes.');
      }

      await pool.execute(
        `UPDATE user_kyc
         SET bank_name = ?, account_number = ?, ifsc_code = ?, branch_name = ?,
             nominee_name = ?, nominee_relation = ?, kyc_status = 'pending',
             rejected_reason = NULL, submitted_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation, userId]
      );
      return existing.id;
    } else {
      // Create new KYC
      const [result] = await pool.execute(
        `INSERT INTO user_kyc (user_id, bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation]
      );
      return result.insertId;
    }
  },

  // Approve KYC
  async approve(id) {
    await pool.execute(
      `UPDATE user_kyc SET kyc_status = 'approved', approved_at = CURRENT_TIMESTAMP, rejected_reason = NULL WHERE id = ?`,
      [id]
    );
  },

  // Reject KYC
  async reject(id, reason) {
    await pool.execute(
      `UPDATE user_kyc SET kyc_status = 'rejected', rejected_reason = ?, approved_at = NULL WHERE id = ?`,
      [reason, id]
    );
  },

  // Get all KYC submissions (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT k.*, u.name, u.email, u.mobile
      FROM user_kyc k
      JOIN users u ON k.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND k.kyc_status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY k.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Count KYC submissions
  async count(filters = {}) {
    let query = `
      SELECT COUNT(*) as total
      FROM user_kyc k
      JOIN users u ON k.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND k.kyc_status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Delete KYC (for user account deletion)
  async delete(userId) {
    await pool.execute('DELETE FROM user_kyc WHERE user_id = ?', [userId]);
  },

  // Update KYC by admin
  async updateByAdmin(id, kycData) {
    const { bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation, kyc_status } = kycData;

    const updateFields = [];
    const params = [];

    if (bank_name !== undefined) {
      updateFields.push('bank_name = ?');
      params.push(bank_name);
    }
    if (account_number !== undefined) {
      updateFields.push('account_number = ?');
      params.push(account_number);
    }
    if (ifsc_code !== undefined) {
      updateFields.push('ifsc_code = ?');
      params.push(ifsc_code);
    }
    if (branch_name !== undefined) {
      updateFields.push('branch_name = ?');
      params.push(branch_name);
    }
    if (nominee_name !== undefined) {
      updateFields.push('nominee_name = ?');
      params.push(nominee_name);
    }
    if (nominee_relation !== undefined) {
      updateFields.push('nominee_relation = ?');
      params.push(nominee_relation);
    }
    if (kyc_status !== undefined) {
      updateFields.push('kyc_status = ?');
      params.push(kyc_status);
    }

    if (updateFields.length === 0) {
      return false;
    }

    params.push(id);
    await pool.execute(
      `UPDATE user_kyc SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    return true;
  }
};

module.exports = KYC;