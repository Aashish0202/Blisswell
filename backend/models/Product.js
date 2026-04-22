const pool = require('../config/db');

const Product = {
  // Create product
  async create(productData) {
    const { name, description, price, salary_amount, salary_duration, image, is_active } = productData;
    const [result] = await pool.execute(
      `INSERT INTO products (name, description, price, salary_amount, salary_duration, image, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        price,
        salary_amount || 100.00,
        salary_duration || 12,
        image,
        is_active !== undefined ? is_active : true
      ]
    );
    return result.insertId;
  },

  // Get all products
  async getAll(activeOnly = false) {
    let query = 'SELECT * FROM products';
    if (activeOnly) {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query);
    return rows;
  },

  // Get product by ID
  async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Get active product (primary product)
  async getActiveProduct() {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE is_active = TRUE LIMIT 1'
    );
    return rows[0];
  },

  // Update product
  async update(id, productData) {
    const fields = [];
    const values = [];

    Object.keys(productData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(productData[key]);
    });

    values.push(id);

    await pool.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Delete product
  async delete(id) {
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  },

  // Toggle active status
  async toggleActive(id, status) {
    await pool.execute(
      'UPDATE products SET is_active = ? WHERE id = ?',
      [status, id]
    );
  },

  // Update price
  async updatePrice(id, price) {
    await pool.execute(
      'UPDATE products SET price = ? WHERE id = ?',
      [price, id]
    );
  }
};

module.exports = Product;