const pool = require('../config/db');

const Gallery = {
  // Get all gallery images
  async getAll(page = 1, limit = 50, filters = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Get active gallery images (public)
  async getActive() {
    const [rows] = await pool.execute(
      'SELECT * FROM gallery WHERE is_active = TRUE ORDER BY display_order ASC, created_at DESC'
    );
    return rows;
  },

  // Get gallery image by ID
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM gallery WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Create gallery image
  async create(imageData) {
    const { title, description, category, image_url, display_order = 0, is_active = true } = imageData;
    const [result] = await pool.execute(
      `INSERT INTO gallery (title, description, category, image_url, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || null, category, image_url, display_order, is_active]
    );
    return result.insertId;
  },

  // Update gallery image
  async update(id, imageData) {
    const fields = [];
    const values = [];

    Object.keys(imageData).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(imageData[key]);
    });

    values.push(id);

    await pool.execute(
      `UPDATE gallery SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Delete gallery image
  async delete(id) {
    await pool.execute('DELETE FROM gallery WHERE id = ?', [id]);
  },

  // Toggle active status
  async toggleStatus(id, status) {
    await pool.execute(
      'UPDATE gallery SET is_active = ? WHERE id = ?',
      [status, id]
    );
  },

  // Count gallery images
  async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM gallery WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    const [rows] = await pool.execute(query, params);
    return rows[0].total;
  },

  // Get categories
  async getCategories() {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category FROM gallery ORDER BY category'
    );
    return rows.map(row => row.category);
  }
};

module.exports = Gallery;