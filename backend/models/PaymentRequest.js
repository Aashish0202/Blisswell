const pool = require('../config/db');

// Manual QR / UPI payment requests. The user pays the admin's static QR,
// then submits the UTR + a screenshot. No order exists until the admin
// approves — approval creates the paid order (see services/qrPaymentService).
const PaymentRequest = {
  // Boot-time schema guard (same pattern as OfferBanner.ensureTable):
  // payment_requests table, orders.payment_type 'qr', products.is_purchasable.
  async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        design_name VARCHAR(100) NULL,
        design_image VARCHAR(500) NULL,
        amount DECIMAL(12,2) NOT NULL,
        utr VARCHAR(50) NOT NULL,
        screenshot VARCHAR(500) NOT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reject_reason VARCHAR(500) NULL,
        order_id INT NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_payment_requests_utr (utr),
        INDEX idx_payment_requests_user (user_id, status),
        INDEX idx_payment_requests_status (status, created_at)
      )
    `);

    const [[payType]] = await pool.query(
      `SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_type'`
    );
    if (payType && !String(payType.t).includes("'qr'")) {
      await pool.query(
        `ALTER TABLE orders MODIFY payment_type
           ENUM('wallet','razorpay','repurchase_wallet','qr') DEFAULT 'wallet'`
      );
      console.log("✅ Added 'qr' to orders.payment_type");
    }

    const [[purch]] = await pool.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_purchasable'`
    );
    if (!purch.n) {
      await pool.query('ALTER TABLE products ADD COLUMN is_purchasable BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active');
      // Only the entry package (Star, rank_order 1) stays buyable; the other
      // rank products become display-only "repurchase coming soon" items.
      await pool.query(`UPDATE products SET is_purchasable = TRUE WHERE rank_order = 1 OR rank_name = 'Star'`);
      console.log('✅ Added products.is_purchasable (Star package purchasable, others display-only)');
    }
  },

  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO payment_requests (user_id, product_id, design_name, design_image, amount, utr, screenshot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.product_id, data.design_name || null, data.design_image || null,
        data.amount, data.utr, data.screenshot]
    );
    return result.insertId;
  },

  async findById(id, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT pr.*, p.name AS product_name, u.name AS user_name, u.email AS user_email,
              u.referral_code, u.mobile AS user_phone, o.order_number
         FROM payment_requests pr
         JOIN products p ON p.id = pr.product_id
         JOIN users u ON u.id = pr.user_id
         LEFT JOIN orders o ON o.id = pr.order_id
        WHERE pr.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByUtr(utr) {
    const [rows] = await pool.execute('SELECT id FROM payment_requests WHERE utr = ?', [utr]);
    return rows[0] || null;
  },

  async getPendingForUser(userId) {
    const [rows] = await pool.execute(
      `SELECT id FROM payment_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async getByUser(userId) {
    const [rows] = await pool.execute(
      `SELECT pr.id, pr.product_id, pr.design_name, pr.design_image, pr.amount, pr.utr, pr.screenshot,
              pr.status, pr.reject_reason, pr.order_id, pr.reviewed_at, pr.created_at,
              p.name AS product_name, o.order_number
         FROM payment_requests pr
         JOIN products p ON p.id = pr.product_id
         LEFT JOIN orders o ON o.id = pr.order_id
        WHERE pr.user_id = ?
        ORDER BY pr.created_at DESC, pr.id DESC
        LIMIT 50`,
      [userId]
    );
    return rows;
  },

  async getAll({ status, search, page = 1, limit = 20 } = {}) {
    const where = [];
    const params = [];
    if (status) { where.push('pr.status = ?'); params.push(status); }
    if (search) {
      where.push('(pr.utr LIKE ? OR u.name LIKE ? OR u.referral_code LIKE ? OR u.email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * limit;

    const [rows] = await pool.query(
      `SELECT pr.*, p.name AS product_name, u.name AS user_name, u.email AS user_email,
              u.referral_code, u.mobile AS user_phone, o.order_number,
              a.name AS reviewed_by_name
         FROM payment_requests pr
         JOIN products p ON p.id = pr.product_id
         JOIN users u ON u.id = pr.user_id
         LEFT JOIN orders o ON o.id = pr.order_id
         LEFT JOIN users a ON a.id = pr.reviewed_by
         ${whereSql}
        ORDER BY (pr.status = 'pending') DESC, pr.created_at DESC, pr.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM payment_requests pr JOIN users u ON u.id = pr.user_id ${whereSql}`,
      params
    );
    return { requests: rows, total };
  },

  async countPending() {
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM payment_requests WHERE status = 'pending'`);
    return n;
  }
};

module.exports = PaymentRequest;
