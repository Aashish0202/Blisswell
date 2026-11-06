const pool = require('../config/db');
const { allocateInvoiceNumber } = require('../utils/helpers');
const Product = require('./Product');
const { PAID_ORDER_STATUSES } = require('./orderStatus');

// When an order was placed for a specific design, show that design's image
// instead of the product's main image. Drops the raw designs JSON.
// design_image is snapshotted when the order is placed, so later admin edits
// to the design never change past orders; the live lookup is only a fallback
// for rows that predate the snapshot column.
const applyDesignImage = (rows) => rows.map(({ product_designs, ...row }) => {
  if (row.design_image) {
    row.product_image = row.design_image;
  } else if (row.design_name && product_designs) {
    const { designs } = Product.parseDesigns({ designs: product_designs });
    const design = designs.find(d => d.name === row.design_name);
    if (design && design.images.length > 0) row.product_image = design.images[0];
  }
  return row;
});

const Order = {
  // Startup schema step: add orders.design_image and snapshot the current
  // design image onto existing design orders (best available for old rows).
  // Idempotent — does nothing once the column exists.
  async ensureDesignSnapshot() {
    const [cols] = await pool.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'design_image'`
    );
    if (cols[0].n > 0) return;

    await pool.query('ALTER TABLE orders ADD COLUMN design_image VARCHAR(500) NULL AFTER design_name');

    const [rows] = await pool.query(
      `SELECT o.id, o.design_name, p.designs
         FROM orders o JOIN products p ON o.product_id = p.id
        WHERE o.design_name IS NOT NULL AND p.designs IS NOT NULL`
    );
    let filled = 0;
    for (const row of rows) {
      const image = Product.designSnapshotImage(Product.parseDesigns(row), row.design_name);
      if (image) {
        await pool.execute('UPDATE orders SET design_image = ? WHERE id = ?', [image, row.id]);
        filled++;
      }
    }
    console.log(`✅ Added orders.design_image (backfilled ${filled} existing design orders)`);
  },

  // Create order. Call only with an ALREADY-CONFIRMED payment (status should
  // not be 'processing'/'failed') — the invoice number is allocated here.
  async create(orderData, connection = pool) {
    const { user_id, product_id, amount, payment_type, status, order_source, source_withdrawal_id } = orderData;
    const conn = connection;

    const invoiceNumber = await allocateInvoiceNumber(conn);

    const [result] = await conn.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_source, source_withdrawal_id, order_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        product_id,
        amount,
        payment_type,
        status || 'pending',
        order_source || 'user',
        source_withdrawal_id || null,
        invoiceNumber
      ]
    );
    return { id: result.insertId, order_number: invoiceNumber };
  },

  // Get order by ID
  async getById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, p.name as product_name, u.name as user_name, u.email as user_email, u.mobile as user_mobile
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0];
  },

  // Get orders by user ID
  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT o.*, p.name as product_name, p.image as product_image, p.designs as product_designs, p.price as product_price, p.description as product_description
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ?
         AND o.status IN ('pending', 'delivered', 'shipped', 'cancelled')
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return applyDesignImage(rows);
  },

  // Count orders by user ID (matches getByUserId status filter, for pagination)
  async countByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM orders
       WHERE user_id = ? AND status IN ('pending', 'delivered', 'shipped', 'cancelled')`,
      [userId]
    );
    return rows[0].total;
  },

  // Get a user's purchases (product name + price + date) — used to show a
  // sponsor what their referral bought. Paid orders only.
  async getPurchasesByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT p.name as product_name, o.amount as price, o.created_at as purchase_date, o.status
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ? AND o.status IN (${PAID_ORDER_STATUSES})
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Get all orders (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.*, p.name as product_name, p.image as product_image, p.designs as product_designs, u.name as user_name, u.email as user_email,
             u.mobile as user_mobile, u.address as user_address, u.state as user_state, u.pincode as user_pincode
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // By default only show orders with a completed payment flow (pending-shipment,
    // shipped, delivered, cancelled-after-delivery). Orders where payment was
    // merely initiated but never completed (processing / failed) are hidden —
    // they should not appear in the orders list. When an admin explicitly
    // filters by a status, honor it.
    if (!filters.status) {
      query += " AND o.status IN ('pending', 'delivered', 'shipped', 'cancelled')";
    }

    if (filters.status) {
      query += ' AND o.status = ?';
      params.push(filters.status);
    }
    if (filters.user_id) {
      query += ' AND o.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR o.order_number LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.start_date && filters.end_date) {
      query += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return applyDesignImage(rows);
  },

  // Count orders
  async count(filters = {}) {
    let query = "SELECT COUNT(*) as total FROM orders WHERE 1=1";
    const params = [];

    // By default only count orders with a completed payment flow (see getAll).
    if (!filters.status) {
      query += " AND status IN ('pending', 'delivered', 'shipped', 'cancelled')";
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.start_date && filters.end_date) {
      query += ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Update order status
  async updateStatus(id, status) {
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
  },

  // Expire orders stuck in 'processing' (payment initiated but never completed)
  // for longer than `timeoutMinutes`. Marks them 'failed' and also fails the
  // matching pending 'purchase' wallet_transactions so they don't pile up.
  async expireStuckProcessingOrders(timeoutMinutes = 30) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Select first so we can return the affected ids + count
      const [stuck] = await conn.execute(
        `SELECT id, order_number, user_id, amount
         FROM orders
         WHERE status = 'processing'
           AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > ?
         FOR UPDATE`,
        [timeoutMinutes]
      );

      if (!stuck.length) {
        await conn.commit();
        return { count: 0, order_ids: [] };
      }

      const ids = stuck.map((r) => r.id);

      // Mark orders as failed
      await conn.execute(
        `UPDATE orders SET status = 'failed' WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );

      // Mark the matching pending purchase wallet_transactions as failed
      await conn.execute(
        `UPDATE wallet_transactions
         SET status = 'failed'
         WHERE status = 'pending'
           AND type = 'purchase'
           AND CAST(order_id AS UNSIGNED) IN (${ids.map(() => '?').join(',')})`,
        ids
      );

      await conn.commit();
      return { count: stuck.length, order_ids: ids };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Get order by order number
  async getByOrderNumber(orderNumber) {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );
    return rows[0];
  },

  // Get total sales (only orders that actually completed payment; abandoned /
  // failed / processing orders never generated revenue and must be excluded.
  // 'pending' = paid but awaiting shipment, so it still counts as revenue)
  async getTotalSales(startDate = null, endDate = null) {
    let query = `SELECT SUM(amount) as total FROM orders WHERE status IN (${PAID_ORDER_STATUSES})`;
    const params = [];

    if (startDate && endDate) {
      query += ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total || 0;
  },

  // Get order count by status
  async getCountByStatus() {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    return rows;
  },

  // Get recent orders (only completed-payment orders — abandoned/cancelled-payment
  // orders are excluded so they don't surface on dashboards)
  async getRecent(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as user_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.status IN ('pending', 'delivered', 'shipped', 'cancelled')
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
};

module.exports = Order;