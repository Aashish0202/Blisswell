const pool = require('../config/db');

const Order = {
  // Create order
  async create(orderData, connection = pool) {
    const { user_id, product_id, amount, payment_type } = orderData;
    const conn = connection;
    const [result] = await conn.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, order_number)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, product_id, amount, payment_type, `ORD${Date.now()}`]
    );
    return result.insertId;
  },

  // Get order by ID
  async getById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, p.name as product_name, u.name as user_name, u.email as user_email, u.mobile as user_mobile
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0];
  },

  // Get orders by user ID
  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      `SELECT o.*, p.name as product_name, p.image as product_image, p.price as product_price
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Get all orders (admin)
  async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.*, p.name as product_name, p.image as product_image, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

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
    return rows;
  },

  // Count orders
  async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params = [];

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

  // Get order by order number
  async getByOrderNumber(orderNumber) {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );
    return rows[0];
  },

  // Get total sales
  async getTotalSales(startDate = null, endDate = null) {
    let query = 'SELECT SUM(amount) as total FROM orders WHERE status != "cancelled"';
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

  // Get recent orders
  async getRecent(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as user_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
};

module.exports = Order;