const pool = require('../config/db');

// Team Income distribution events — one per (order, upline, level).
// UNIQUE(reference_key) makes distribution idempotent / replay-safe.
const TeamIncomeEvent = {
  // Returns the new id, or throws ER_DUP_ENTRY if the reference_key already
  // exists (the service catches this to make distribution idempotent).
  async create(data, connection = pool) {
    const conn = connection;
    const {
      order_id, purchaser_id, upline_id, level, amount, rank_name, product_id,
      qualified_directs, max_unlocked_level, reference_key, transaction_id
    } = data;
    const [result] = await conn.execute(
      `INSERT INTO team_income_events
       (order_id, purchaser_id, upline_id, level, amount, rank_name, product_id, qualified_directs, max_unlocked_level, reference_key, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id, purchaser_id, upline_id, level, amount,
        rank_name || null, product_id || null,
        qualified_directs, max_unlocked_level, reference_key, transaction_id || null
      ]
    );
    return result.insertId;
  },

  async getByUpline(uplineId, page = 1, limit = 20, connection = pool, source = '') {
    const conn = connection;
    const offset = (page - 1) * limit;
    const params = [uplineId];
    let sourceFilter = '';
    // 'purchase' = income from manual purchases; 'repurchase' = income the
    // auto-repurchase engine's upgrades triggered.
    if (source === 'purchase' || source === 'repurchase') {
      sourceFilter = ' AND o.order_source = ?';
      params.push(source === 'repurchase' ? 'auto_repurchase' : 'user');
    }
    params.push(limit, offset);
    const [rows] = await conn.execute(
      `SELECT tie.*, u.name as purchaser_name,
              o.order_source
       FROM team_income_events tie
       JOIN users u ON tie.purchaser_id = u.id
       LEFT JOIN orders o ON o.id = tie.order_id
       WHERE tie.upline_id = ?${sourceFilter}
       ORDER BY tie.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows;
  },

  async countByUpline(uplineId, connection = pool, source = '') {
    const conn = connection;
    const params = [uplineId];
    let sourceFilter = '';
    if (source === 'purchase' || source === 'repurchase') {
      sourceFilter = ' AND o.order_source = ?';
      params.push(source === 'repurchase' ? 'auto_repurchase' : 'user');
    }
    const [rows] = await conn.execute(
      `SELECT COUNT(*) as count FROM team_income_events tie
       LEFT JOIN orders o ON o.id = tie.order_id
       WHERE tie.upline_id = ?${sourceFilter}`,
      params
    );
    return rows[0].count;
  },

  // Earnings split by what triggered them: manual purchases of downline
  // members vs auto-repurchase (rank upgrade) orders.
  async sourceTotalsByUpline(uplineId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT COALESCE(o.order_source, 'user') AS order_source,
              COALESCE(SUM(tie.amount), 0) AS total, COUNT(*) AS count
       FROM team_income_events tie
       LEFT JOIN orders o ON o.id = tie.order_id
       WHERE tie.upline_id = ?
       GROUP BY COALESCE(o.order_source, 'user')`,
      [uplineId]
    );
    const totals = { purchase: 0, repurchase: 0, purchaseCount: 0, repurchaseCount: 0 };
    rows.forEach(r => {
      if (r.order_source === 'auto_repurchase') {
        totals.repurchase = parseFloat(r.total) || 0;
        totals.repurchaseCount = parseInt(r.count, 10) || 0;
      } else {
        totals.purchase = parseFloat(r.total) || 0;
        totals.purchaseCount = parseInt(r.count, 10) || 0;
      }
    });
    return totals;
  },

  async getByOrder(orderId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT tie.*, u.name as upline_name
       FROM team_income_events tie
       JOIN users u ON tie.upline_id = u.id
       WHERE tie.order_id = ?
       ORDER BY tie.level ASC`,
      [orderId]
    );
    return rows;
  },

  async sumByUpline(uplineId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM team_income_events WHERE upline_id = ?`,
      [uplineId]
    );
    return parseFloat(rows[0].total) || 0;
  },

  // Per-level earned totals for an upline (1..10).
  async levelTotalsByUpline(uplineId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      `SELECT level, COALESCE(SUM(amount), 0) as earned, COUNT(*) as count
       FROM team_income_events WHERE upline_id = ?
       GROUP BY level ORDER BY level ASC`,
      [uplineId]
    );
    const totals = {};
    rows.forEach(r => { totals[r.level] = { earned: parseFloat(r.earned), count: parseInt(r.count, 10) }; });
    return totals;
  }
};

module.exports = TeamIncomeEvent;