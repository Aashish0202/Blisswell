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

  // Parse the per-rank level income JSON into a plain array of 10 numbers
  // (levels 1..10). Missing/invalid entries default to 0.
  parseLevelIncome(product) {
    if (!product) return null;
    let table = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (product.level_income) {
      try {
        const parsed = typeof product.level_income === 'string'
          ? JSON.parse(product.level_income)
          : product.level_income;
        if (Array.isArray(parsed)) {
          table = parsed.map(v => parseFloat(v) || 0);
        }
      } catch (e) {
        // Invalid JSON — fall through to zeros
      }
    }
    while (table.length < 10) table.push(0);
    return { ...product, level_income: table.slice(0, 10) };
  },

  // Parse the designs JSON into an array of {name, description, images: []}.
  // Empty/invalid → [] so callers can branch on designs.length.
  parseDesigns(product) {
    if (!product) return null;
    let designs = [];
    if (product.designs) {
      try {
        const parsed = typeof product.designs === 'string'
          ? JSON.parse(product.designs)
          : product.designs;
        if (Array.isArray(parsed)) {
          // Normalize: keep only well-formed entries with a name
          const designs = parsed
            .filter(d => d && typeof d === 'object' && (d.name || '').trim())
            .map(d => ({
              name: String(d.name).trim(),
              description: d.description ? String(d.description) : '',
              video_link: d.video_link ? String(d.video_link) : '',
              images: Array.isArray(d.images) ? d.images.filter(Boolean) : []
            }));
          return { ...product, designs };
        }
      } catch (e) {
        // Invalid JSON — fall through to empty
      }
    }
    return { ...product, designs: [] };
  },

  // Full parse pipeline applied to every product row that leaves this model
  parseProduct(product) {
    return this.parseDesigns(this.parseLevelIncome(this.parseImages(product)));
  },

  // Resolve a design by name. Returns { index, design } or null.
  // Products without designs always resolve to { index: 0, design: null }
  // with any/absent design_name, so legacy products stay buyable.
  findDesign(product, designName) {
    if (!product) return null;
    const designs = Array.isArray(product.designs) ? product.designs : [];
    if (designs.length === 0) {
      return designName ? null : { index: 0, design: null };
    }
    if (!designName) return null;
    const idx = designs.findIndex(d => d.name === designName);
    return idx >= 0 ? { index: idx, design: designs[idx] } : null;
  },

  // Create product
  async create(productData) {
    const { name, description, price, daily_amount, days, salary_amount, salary_duration, image, images, youtube_link, is_active, rank_name, level_income, rank_order } = productData;

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

    // Per-rank level income: caller may pass an array (levels 1..10)
    let levelIncomeJson = null;
    if (Array.isArray(level_income)) {
      const table = [...level_income].map(v => parseFloat(v) || 0);
      while (table.length < 10) table.push(0);
      levelIncomeJson = JSON.stringify(table.slice(0, 10));
    } else if (level_income && typeof level_income === 'string') {
      levelIncomeJson = level_income;
    }

    // Designs: array of {name, description, video_link, images: []} → JSON
    let designsJson = null;
    if (Array.isArray(productData.designs) && productData.designs.length > 0) {
      designsJson = JSON.stringify(
        productData.designs
          .filter(d => d && (d.name || '').trim())
          .map(d => ({
            name: String(d.name).trim(),
            description: d.description ? String(d.description) : '',
            video_link: d.video_link ? String(d.video_link) : '',
            images: Array.isArray(d.images) ? d.images.filter(Boolean) : []
          }))
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO products (name, rank_name, level_income, rank_order, description, price, salary_amount, salary_duration, daily_amount, days, image, images, youtube_link, is_active, designs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        rank_name || null,
        levelIncomeJson,
        rank_order != null ? rank_order : 0,
        description != null ? description : null,
        price,
        salary_amount != null ? salary_amount : (daily_amount || 100.00),
        salary_duration != null ? salary_duration : (days || 12),
        daily_amount || 100.00,
        days || 12,
        singleImage,
        imagesJson,
        youtube_link || null,
        is_active !== undefined ? is_active : true,
        designsJson
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
    query += ' ORDER BY rank_order ASC, price ASC, created_at DESC';
    const [rows] = await pool.execute(query);
    return rows.map(row => this.parseProduct(row));
  },

  // Get product by ID
  async getById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return this.parseProduct(rows[0]);
  },

  // Get active product (primary product)
  async getActiveProduct() {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE is_active = TRUE LIMIT 1'
    );
    return this.parseProduct(rows[0]);
  },

  // All active rank products, lowest tier first
  async getActiveRanks(connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY rank_order ASC, price ASC'
    );
    return rows.map(row => this.parseProduct(row));
  },

  // The next higher-priced active product above the given product's tier
  // (by rank_order, falling back to price for legacy rows with no tier).
  // Returns null at the top rank.
  async getNextHigherProduct(currentProductId, connection = pool) {
    const conn = connection;
    const [cur] = await conn.execute('SELECT * FROM products WHERE id = ?', [currentProductId]);
    const current = cur[0];
    if (!current) return null;

    if (current.rank_order != null && current.rank_order > 0) {
      const [rows] = await conn.execute(
        `SELECT * FROM products
         WHERE is_active = TRUE AND rank_order > ?
         ORDER BY rank_order ASC, price ASC
         LIMIT 1`,
        [current.rank_order]
      );
      return this.parseProduct(rows[0] || null);
    }

    // Legacy fallback: next higher by price
    const [rows] = await conn.execute(
      `SELECT * FROM products
       WHERE is_active = TRUE AND price > ?
       ORDER BY price ASC
       LIMIT 1`,
      [current.price]
    );
    return this.parseProduct(rows[0] || null);
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

    // Handle per-rank level income array (levels 1..10)
    if (productData.level_income !== undefined && Array.isArray(productData.level_income)) {
      const table = [...productData.level_income].map(v => parseFloat(v) || 0);
      while (table.length < 10) table.push(0);
      fields.push('level_income = ?');
      values.push(JSON.stringify(table.slice(0, 10)));
      delete productData.level_income;
    }

    // Handle designs array of {name, description, video_link, images: []}
    if (productData.designs !== undefined) {
      const designs = Array.isArray(productData.designs) ? productData.designs : [];
      fields.push('designs = ?');
      values.push(designs.length > 0 ? JSON.stringify(
        designs
          .filter(d => d && (d.name || '').trim())
          .map(d => ({
            name: String(d.name).trim(),
            description: d.description ? String(d.description) : '',
            video_link: d.video_link ? String(d.video_link) : '',
            images: Array.isArray(d.images) ? d.images.filter(Boolean) : []
          }))
      ) : null);
      delete productData.designs;
    }

    Object.keys(productData).forEach(key => {
      // Skip image fields (handled above) and fields not provided by the caller.
      // undefined would crash mysql2 ("Bind parameters must not contain undefined");
      // to clear a nullable column the caller must pass null explicitly.
      if (key === 'images' || key === 'image' || key === 'level_income' || key === 'designs' || productData[key] === undefined) {
        return;
      }
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