/**
 * Script to clean up incomplete orders (pending, processing, failed)
 *
 * This script should be run once after deploying the fix for cancelled payments.
 * It will delete orders that were created but never completed payment.
 *
 * Run with: node scripts/cleanup_incomplete_orders.js
 */

require('dotenv').config();
const pool = require('../config/db');

async function cleanupIncompleteOrders() {
  const connection = await pool.getConnection();

  try {
    console.log('Starting cleanup of incomplete orders...');

    // First, check if 'failed' status exists in the ENUM
    const [columns] = await connection.execute(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'status'
    `);

    console.log('Current status ENUM:', columns[0]?.COLUMN_TYPE);

    // Check if 'failed' is in the ENUM
    const hasFailedStatus = columns[0]?.COLUMN_TYPE?.includes("'failed'");

    if (!hasFailedStatus) {
      console.log('\n⚠️  The ENUM does not include "failed" status.');
      console.log('Please run the migration first:');
      console.log('mysql -u username -p database_name < database/migration_add_failed_status.sql');
      console.log('\nAlternatively, run this SQL directly:');
      console.log("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed') DEFAULT 'pending';");

      // We can still proceed with cleanup, orders will be deleted instead of updated
    }

    // Count orders by status
    const [statusCounts] = await connection.execute(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    console.log('\nCurrent order counts by status:');
    statusCounts.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    // Get orders that should be cleaned up (older than 24 hours with incomplete status)
    const [oldIncomplete] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ('pending', 'processing', 'failed')
      AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    console.log(`\nIncomplete orders older than 24 hours: ${oldIncomplete[0].count}`);

    // Get recent incomplete orders (within last 24 hours)
    const [recentIncomplete] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ('pending', 'processing', 'failed')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    console.log(`Incomplete orders within last 24 hours: ${recentIncomplete[0].count}`);
    console.log('(These are kept in case payment is still processing)\n');

    // Delete old incomplete orders
    const [deleteResult] = await connection.execute(`
      DELETE o FROM orders o
      WHERE o.status IN ('pending', 'processing', 'failed')
      AND o.created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    console.log(`Deleted ${deleteResult.affectedRows} incomplete orders older than 24 hours.`);

    // Also clean up wallet transactions for deleted orders
    const [txDeleteResult] = await connection.execute(`
      DELETE wt FROM wallet_transactions wt
      LEFT JOIN orders o ON wt.order_id = o.id
      WHERE o.id IS NULL AND wt.order_id IS NOT NULL
    `);

    console.log(`Cleaned up ${txDeleteResult.affectedRows} orphaned wallet transactions.`);

    // Show final counts
    const [finalCounts] = await connection.execute(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    console.log('\nFinal order counts by status:');
    finalCounts.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

cleanupIncompleteOrders();