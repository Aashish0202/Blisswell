const pool = require('../config/db');

// Offer banners shown at the top of the user dashboard between start_at and
// end_at. Dates are always passed to/from mysql2 as JS Date objects so both
// directions use the Node process timezone — never compare against MySQL
// NOW(), whose session timezone may differ from Node's.
const OfferBanner = {
  // Idempotent — called at startup so no manual migration is needed.
  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offer_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        image_url VARCHAR(500),
        link_url VARCHAR(500),
        link_text VARCHAR(100),
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_offer_banners_window (is_active, start_at, end_at)
      )
    `);
  },

  async getAll() {
    const [rows] = await pool.execute(
      'SELECT * FROM offer_banners ORDER BY display_order ASC, start_at DESC, id DESC'
    );
    return rows;
  },

  // Banners that should be visible right now (user dashboard)
  async getCurrent() {
    const now = new Date();
    const [rows] = await pool.execute(
      `SELECT id, title, message, image_url, link_url, link_text, start_at, end_at
       FROM offer_banners
       WHERE is_active = TRUE AND start_at <= ? AND end_at >= ?
       ORDER BY display_order ASC, start_at DESC, id DESC`,
      [now, now]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM offer_banners WHERE id = ?', [id]);
    return rows[0];
  },

  async create(data) {
    const {
      title, message, image_url, link_url, link_text,
      start_at, end_at, is_active = true, display_order = 0
    } = data;
    const [result] = await pool.execute(
      `INSERT INTO offer_banners
         (title, message, image_url, link_url, link_text, start_at, end_at, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, message || null, image_url || null, link_url || null, link_text || null,
        start_at, end_at, is_active, display_order]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    });
    if (fields.length === 0) return;

    values.push(id);
    await pool.execute(`UPDATE offer_banners SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id) {
    await pool.execute('DELETE FROM offer_banners WHERE id = ?', [id]);
  }
};

module.exports = OfferBanner;
