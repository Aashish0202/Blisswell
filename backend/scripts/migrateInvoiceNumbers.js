const pool = require('../config/db');

// Migration script to update existing orders with new invoice number format
// Format: BSW + sequential number (starting from 1000000) + userId padded to 2 digits

async function migrateInvoiceNumbers() {
  const connection = await pool.getConnection();

  try {
    console.log('Starting invoice number migration...');

    // Get all orders ordered by creation date (oldest first)
    const [orders] = await connection.execute(
      `SELECT id, user_id, order_number, created_at FROM orders ORDER BY created_at ASC, id ASC`
    );

    console.log(`Found ${orders.length} orders to migrate`);

    if (orders.length === 0) {
      console.log('No orders to migrate');
      return;
    }

    // Start transaction
    await connection.beginTransaction();

    let counter = 1;
    const baseNumber = 1000000;

    for (const order of orders) {
      // Generate new invoice number: BSW + 1000000 + userId
      const paddedUserId = order.user_id.toString().padStart(2, '0');
      const newInvoiceNumber = `BSW1000000${paddedUserId}`;

      // Update the order
      await connection.execute(
        'UPDATE orders SET order_number = ? WHERE id = ?',
        [newInvoiceNumber, order.id]
      );

      console.log(`Order ${order.id}: ${order.order_number} -> ${newInvoiceNumber}`);
      counter++;
    }

    // Commit transaction
    await connection.commit();

    console.log(`\nMigration completed successfully!`);
    console.log(`Updated ${orders.length} orders`);

  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run migration
migrateInvoiceNumbers().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});