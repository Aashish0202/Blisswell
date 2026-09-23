const pool = require('../config/db');

// Audit trail for admin income-settings changes (§13).
const SettingAuditLog = {
  async create(data, connection = pool) {
    const conn = connection;
    const { admin_id, setting_key, previous_value, new_value, ip_address } = data;
    const [result] = await conn.execute(
      `INSERT INTO setting_audit_logs
       (admin_id, setting_key, previous_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [admin_id, setting_key, previous_value != null ? String(previous_value) : null,
       new_value != null ? String(new_value) : null, ip_address || null]
    );
    return result.insertId;
  },

  async getAll(page = 1, limit = 50, connection = pool) {
    const conn = connection;
    const offset = (page - 1) * limit;
    const [rows] = await conn.execute(
      `SELECT sal.*, u.name as admin_name, u.email as admin_email
       FROM setting_audit_logs sal
       JOIN users u ON sal.admin_id = u.id
       ORDER BY sal.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  },

  async countAll(connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM setting_audit_logs');
    return rows[0].total;
  }
};

module.exports = SettingAuditLog;