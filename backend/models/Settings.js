const pool = require('../config/db');

const Settings = {
  // Get all settings as { key: value }
  async getAll() {
    const [rows] = await pool.execute('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  },

  // Get a single setting value by key
  async get(key) {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [key]
    );
    return rows[0]?.setting_value;
  },

  // Atomic upsert (INSERT ... ON DUPLICATE KEY UPDATE) — fixes the
  // duplicate-key bug the old SELECT-then-INSERT suffered from.
  async set(key, value, connection = pool) {
    const conn = connection;
    await conn.execute(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value != null ? String(value) : null]
    );
  },

  // Atomic multi-set, all inside one transaction.
  async setMultiple(settingsObj, connection) {
    const owned = !connection;
    const conn = connection || (await pool.getConnection());
    try {
      if (owned) await conn.beginTransaction();

      for (const [key, value] of Object.entries(settingsObj)) {
        await conn.execute(
          `INSERT INTO settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, value != null ? String(value) : null]
        );
      }

      if (owned) await conn.commit();
    } catch (error) {
      if (owned) await conn.rollback();
      throw error;
    } finally {
      if (owned) conn.release();
    }
  },

  // -------------------------------------------------------------------
  // Income-system settings (rank model)
  // -------------------------------------------------------------------

  // Qualification settings
  async getQualificationSettings(connection = pool) {
    const [rows] = await connection.execute(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('qualification_levels_per_direct','qualification_max_levels')`
    );
    const m = {};
    rows.forEach(r => { m[r.setting_key] = r.setting_value; });
    return {
      levelsPerDirect: parseInt(m.qualification_levels_per_direct, 10) || 2,
      maxLevels: parseInt(m.qualification_max_levels, 10) || 10
    };
  },

  // Full income settings bundle. Level income now lives per product
  // (products.level_income) — see models/Product.js.
  async getIncomeSettings(connection = pool) {
    const all = {};
    const [rows] = await connection.execute(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key LIKE 'qualification_%'
          OR setting_key LIKE 'withdrawal_%'`
    );
    rows.forEach(r => { all[r.setting_key] = r.setting_value; });

    return {
      qualification: {
        levelsPerDirect: parseInt(all.qualification_levels_per_direct, 10) || 2,
        maxLevels: parseInt(all.qualification_max_levels, 10) || 10
      },
      withdrawal: {
        minAmount: parseFloat(all.withdrawal_min_amount) || 0,
        startTime: all.withdrawal_start_time || '07:00',
        endTime: all.withdrawal_end_time || '10:00',
        timezone: all.withdrawal_timezone || 'Asia/Kolkata',
        adminChargePercent: parseFloat(all.withdrawal_admin_charge_percent) || 0
      }
    };
  },

  // Update income settings from a flat { setting_key: value } object.
  // Caller is responsible for audit logging (see adminController).
  async updateIncomeSettings(data, connection = pool) {
    const settings = {};
    if (data.qualification_levels_per_direct !== undefined) settings.qualification_levels_per_direct = data.qualification_levels_per_direct;
    if (data.qualification_max_levels !== undefined) settings.qualification_max_levels = data.qualification_max_levels;
    if (data.withdrawal_min_amount !== undefined) settings.withdrawal_min_amount = data.withdrawal_min_amount;
    if (data.withdrawal_start_time !== undefined) settings.withdrawal_start_time = data.withdrawal_start_time;
    if (data.withdrawal_end_time !== undefined) settings.withdrawal_end_time = data.withdrawal_end_time;
    if (data.withdrawal_timezone !== undefined) settings.withdrawal_timezone = data.withdrawal_timezone;    if (data.withdrawal_admin_charge_percent !== undefined) settings.withdrawal_admin_charge_percent = data.withdrawal_admin_charge_percent;

    if (Object.keys(settings).length > 0) {
      await this.setMultiple(settings, connection);
    }
    return settings;
  },

  // -------------------------------------------------------------------
  // Payment methods (Razorpay gateway / manual static QR). Missing keys
  // default to Razorpay ON, QR OFF — the behaviour before QR existed.
  // -------------------------------------------------------------------
  PAYMENT_KEYS: ['payment_razorpay_enabled', 'payment_qr_enabled', 'payment_qr_image', 'payment_upi_id', 'payment_payee_name'],

  async getPaymentSettings(connection = pool) {
    const [rows] = await connection.execute(
      `SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('payment_razorpay_enabled','payment_qr_enabled','payment_qr_image','payment_upi_id','payment_payee_name')`
    );
    const m = {};
    rows.forEach(r => { m[r.setting_key] = r.setting_value; });
    return {
      razorpayEnabled: m.payment_razorpay_enabled !== undefined ? m.payment_razorpay_enabled === 'true' : true,
      qrEnabled: m.payment_qr_enabled === 'true',
      qrImage: m.payment_qr_image || '',
      upiId: m.payment_upi_id || '',
      payeeName: m.payment_payee_name || ''
    };
  },

  // -------------------------------------------------------------------
  // Site settings (public) — unchanged
  // -------------------------------------------------------------------
  async getSiteSettings() {
    const settings = await this.getAll();
    return {
      site_name: settings.site_name || 'Blisswell',
      site_logo: settings.site_logo || '',
      site_tagline: settings.site_tagline || 'Premium Bedsheets',
      contact_phone: settings.contact_phone || '+91 98765 43210',
      contact_email: settings.contact_email || 'info@blisswell.in',
      contact_address: settings.contact_address || 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA',
      company_state: settings.company_state || 'Maharashtra',
      social_facebook: settings.social_facebook || '',
      social_instagram: settings.social_instagram || '',
      social_twitter: settings.social_twitter || '',
      social_linkedin: settings.social_linkedin || '',
      social_youtube: settings.social_youtube || '',
      terms_and_conditions: settings.terms_and_conditions || 'By registering, you agree to our terms of service and privacy policy. You acknowledge that the referral program is subject to the company\'s terms and conditions.'
    };
  },

  async updateSiteSettings(data) {
    const settings = {};
    if (data.site_name !== undefined) settings.site_name = data.site_name;
    if (data.site_logo !== undefined) settings.site_logo = data.site_logo;
    if (data.site_tagline !== undefined) settings.site_tagline = data.site_tagline;
    if (data.contact_phone !== undefined) settings.contact_phone = data.contact_phone;
    if (data.contact_email !== undefined) settings.contact_email = data.contact_email;
    if (data.contact_address !== undefined) settings.contact_address = data.contact_address;
    if (data.company_state !== undefined) settings.company_state = data.company_state;
    if (data.social_facebook !== undefined) settings.social_facebook = data.social_facebook;
    if (data.social_instagram !== undefined) settings.social_instagram = data.social_instagram;
    if (data.social_twitter !== undefined) settings.social_twitter = data.social_twitter;
    if (data.social_linkedin !== undefined) settings.social_linkedin = data.social_linkedin;
    if (data.social_youtube !== undefined) settings.social_youtube = data.social_youtube;
    if (data.terms_and_conditions !== undefined) settings.terms_and_conditions = data.terms_and_conditions;
    await this.setMultiple(settings);
  }
};

module.exports = Settings;