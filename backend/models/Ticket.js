const db = require('../config/db');

class Ticket {
  // Create a new ticket
  static async create(data) {
    const { user_id, subject, message } = data;
    const [result] = await db.execute(
      `INSERT INTO support_tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'open')`,
      [user_id, subject, message]
    );
    return result.insertId;
  }

  // Get all tickets (admin)
  static async getAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (t.subject LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [tickets] = await db.execute(query, params);
    return tickets;
  }

  // Count tickets
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM support_tickets t JOIN users u ON t.user_id = u.id WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (t.subject LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const [result] = await db.execute(query, params);
    return result[0].total;
  }

  // Get tickets by user
  static async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [tickets] = await db.execute(
      `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return tickets;
  }

  // Get ticket by ID
  static async findById(id) {
    const [tickets] = await db.execute(
      `SELECT t.*, u.name as user_name, u.email as user_email
       FROM support_tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    return tickets[0];
  }

  // Add message to ticket
  static async addMessage(ticketId, data) {
    const { sender_id, sender_type, message } = data;
    const [result] = await db.execute(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)`,
      [ticketId, sender_id, sender_type, message]
    );

    // Update ticket updated_at
    await db.execute(
      'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
      [ticketId]
    );

    return result.insertId;
  }

  // Get ticket messages
  static async getMessages(ticketId) {
    const [messages] = await db.execute(
      `SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
      [ticketId]
    );
    return messages;
  }

  // Update ticket status
  static async updateStatus(id, status) {
    await db.execute(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
  }

  // Get ticket counts by status
  static async getCounts() {
    const [counts] = await db.execute(
      `SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status`
    );
    return counts.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
  }
}

module.exports = Ticket;