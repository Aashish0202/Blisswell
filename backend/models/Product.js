const pool = require('../config/db');

const Product = {
  // Helper function to parse images from database
  parseImages(product) {
    if (!product) return null;

    // If images column exists and has data, parse it
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { ...product, images: parsed };
        }
      } catch (e) {
        // Invalid JSON, fall through to legacy handling
      }
    }

    // Fallback to legacy single image
    if (product.image) {
      return { ...product, images: [product.image] };
    }

    // No images
    return { ...product, images: [] };
  },

  // Create product
  async create(productData) {
    const { name, description, price, salary_amount, salary_duration, image, images, is_active } = productData;

    // Handle images: prioritize new images array, fallback to single image
    let imagesJson = null;
    let singleImage = null;

    if (images && Array.isArray(images) && images.length > 0) {
      imagesJson = JSON.stringify(images);
      singleImage = images[0]; // Keep first image in legacy column for backward compatibility
    } else if (image) {
      singleImage = image;
      imagesJson = JSON.stringify([image]);
    }

    const [result] = await pool.execute(
      `INSERT INTO products (name, description, price, salary_amount, salary_duration, image, images, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        price,
        salary_amount || 100.00,
        salary_duration || 12,
        singleImage,
        imagesJson,
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
    return rows.map(row => this.parseImages(row));
  },

  // Get product by ID
  async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return this.parseImages(rows[0]);
  },

  // Get active product (primary product)
  async getActiveProduct() {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE is_active = TRUE LIMIT 1'
    );
    return this.parseImages(rows[0]);
  },

  // Update product
  async update(id, productData) {
    const fields = [];
    const values = [];

    // Handle images array specially
    if (productData.images !== undefined) {
      const images = productData.images;
      if (Array.isArray(images) && images.length > 0) {
        fields.push('images = ?');
        values.push(JSON.stringify(images));
        fields.push('image = ?');
        values.push(images[0]); // Update legacy column too
      } else if (images.length === 0) {
        fields.push('images = ?');
        values.push(null);
        fields.push('image = ?');
        values.push(null);
      }
      delete productData.images;
    }

    // Handle single image for backward compatibility
    if (productData.image !== undefined) {
      fields.push('image = ?');
      values.push(productData.image);
      // Also update images array if not already set
      if (!fields.includes('images = ?')) {
        fields.push('images = ?');
        values.push(productData.image ? JSON.stringify([productData.image]) : null);
      }
    }

    Object.keys(productData).forEach(key => {
      if (key !== 'images' && key !== 'image') {
        fields.push(`${key} = ?`);
        values.push(productData[key]);
      }
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