const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('Running migration: Create support tickets tables...');

    // Create support_tickets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('support_tickets table created');

    // Create ticket_messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_type ENUM('user', 'admin') NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
      )
    `);
    console.log('ticket_messages table created');

    // Create index for faster queries
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id)
    `);
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status)
    `);
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id)
    `);
    console.log('Indexes created');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();