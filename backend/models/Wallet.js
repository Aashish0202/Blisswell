const pool = require('../config/db');

const Wallet = {
  // Create wallet for user
  async create(userId, connection = pool) {
    const conn = connection;
    const [result] = await conn.execute(
      'INSERT INTO wallets (user_id) VALUES (?)',
      [userId]
    );
    return result.insertId;
  },

  // Get wallet by user ID
  async getByUserId(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT * FROM wallets WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  },

  // Update balance (for deposits) - supports transactions
  async updateBalance(userId, amount, connection = pool) {
    const conn = connection;
    const [result] = await conn.execute(
      'UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?',
      [amount, userId]
    );
    return result.affectedRows > 0;
  },

  // Deduct balance (for purchases) - supports transactions
  async deductBalance(userId, amount, connection = pool) {
    const conn = connection;
    const [result] = await conn.execute(
      'UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE user_id = ? AND balance >= ?',
      [amount, userId, amount]
    );
    return result.affectedRows > 0;
  },

  // Get balance
  async getBalance(userId, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    return rows[0]?.balance || 0;
  },

  // Check if user has sufficient balance
  async hasBalance(userId, amount, connection = pool) {
    const conn = connection;
    const [rows] = await conn.execute(
      'SELECT balance FROM wallets WHERE user_id = ? AND balance >= ?',
      [userId, amount]
    );
    return rows.length > 0;
  }
};

module.exports = Wallet;