const pool = require('../config/db');

const Settings = {
  // Get all settings
  async getAll() {
    const [rows] = await pool.execute('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  },

  // Get setting by key
  async get(key) {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [key]
    );
    return rows[0]?.setting_value;
  },

  // Set setting
  async set(key, value) {
    const existing = await this.get(key);
    if (existing !== undefined) {
      await pool.execute(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
        [value, key]
      );
    } else {
      await pool.execute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
        [key, value]
      );
    }
  },

  // Set multiple settings
  async setMultiple(settingsObj) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const [key, value] of Object.entries(settingsObj)) {
        const existing = await this.get(key);
        if (existing !== undefined) {
          await connection.execute(
            'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
            [value, key]
          );
        } else {
          await connection.execute(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
            [key, value]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Get package settings
  async getPackageSettings() {
    const settings = await this.getAll();
    return {
      package_price: parseFloat(settings.package_price) || parseFloat(process.env.DEFAULT_PACKAGE_PRICE) || 2100,
      default_daily_amount: parseFloat(settings.default_daily_amount) || parseFloat(process.env.DEFAULT_DAILY_AMOUNT) || 50,
      default_days: parseInt(settings.default_days) || parseInt(process.env.DEFAULT_DAYS) || 15,
      min_payout_amount: parseFloat(settings.min_payout_amount) || parseFloat(process.env.MIN_PAYOUT_AMOUNT) || 500,
      payout_day: parseInt(settings.payout_day, 10) >= 0 && parseInt(settings.payout_day, 10) <= 6 ? parseInt(settings.payout_day, 10) : 1,
      repurchase_enabled: settings.repurchase_enabled === 'true'
    };
  },

  // Update package settings
  async updatePackageSettings(data) {
    const settings = {};
    if (data.package_price !== undefined) settings.package_price = data.package_price.toString();
    if (data.default_daily_amount !== undefined) settings.default_daily_amount = data.default_daily_amount.toString();
    if (data.default_days !== undefined) settings.default_days = data.default_days.toString();
    if (data.min_payout_amount !== undefined) settings.min_payout_amount = data.min_payout_amount.toString();
    if (data.payout_day !== undefined) settings.payout_day = String(parseInt(data.payout_day, 10) || 0);
    if (data.repurchase_enabled !== undefined) settings.repurchase_enabled = data.repurchase_enabled.toString();

    await this.setMultiple(settings);
  },

  // Get site settings (public)
  async getSiteSettings() {
    const settings = await this.getAll();
    return {
      site_name: settings.site_name || 'Blisswell',
      site_logo: settings.site_logo || '',
      site_tagline: settings.site_tagline || 'Premium Bedsheets',
      // Contact info
      contact_phone: settings.contact_phone || '+91 98765 43210',
      contact_email: settings.contact_email || 'info@blisswell.in',
      contact_address: settings.contact_address || 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA',
      company_state: settings.company_state || 'Maharashtra',
      // Social links
      social_facebook: settings.social_facebook || '',
      social_instagram: settings.social_instagram || '',
      social_twitter: settings.social_twitter || '',
      social_linkedin: settings.social_linkedin || '',
      social_youtube: settings.social_youtube || '',
      // Terms and conditions
      terms_and_conditions: settings.terms_and_conditions || 'By registering, you agree to our terms of service and privacy policy. You acknowledge that the referral program is subject to the company\'s terms and conditions.'
    };
  },

  // Update site settings
  async updateSiteSettings(data) {
    const settings = {};
    if (data.site_name !== undefined) settings.site_name = data.site_name;
    if (data.site_logo !== undefined) settings.site_logo = data.site_logo;
    if (data.site_tagline !== undefined) settings.site_tagline = data.site_tagline;
    // Contact info
    if (data.contact_phone !== undefined) settings.contact_phone = data.contact_phone;
    if (data.contact_email !== undefined) settings.contact_email = data.contact_email;
    if (data.contact_address !== undefined) settings.contact_address = data.contact_address;
    if (data.company_state !== undefined) settings.company_state = data.company_state;
    // Social links
    if (data.social_facebook !== undefined) settings.social_facebook = data.social_facebook;
    if (data.social_instagram !== undefined) settings.social_instagram = data.social_instagram;
    if (data.social_twitter !== undefined) settings.social_twitter = data.social_twitter;
    if (data.social_linkedin !== undefined) settings.social_linkedin = data.social_linkedin;
    if (data.social_youtube !== undefined) settings.social_youtube = data.social_youtube;
    // Terms and conditions
    if (data.terms_and_conditions !== undefined) settings.terms_and_conditions = data.terms_and_conditions;

    await this.setMultiple(settings);
  }
};

module.exports = Settings;