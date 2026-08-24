const pool = require('../config/db');

// The orders.status enum originally did NOT include 'failed'. Because of that,
// every code path that set status='failed' (the abandoned-order expiry cron, the
// cancelled-payment and failed-payment handlers) silently stored an empty string
// instead — those rows then bypassed every "hide incomplete orders" filter and
// showed up in user order lists, dashboards and admin.
//
// This migration:
//   1. Adds 'failed' to the enum (matches database/schema.sql).
//   2. Backfills the rows that were written as '' (or NULL) to 'failed' so the
//      existing abandoned orders are correctly classified and filtered out.
async function runMigration() {
  try {
    console.log('Running migration: ensure orders.status enum includes "failed"...');

    // 1. Add 'failed' to the status enum (idempotent — re-running just re-asserts it).
    await pool.execute(
      `ALTER TABLE orders
       MODIFY COLUMN status
       ENUM('pending','processing','shipped','delivered','cancelled','failed')
       DEFAULT 'pending'`
    );
    console.log('orders.status enum now includes "failed"');

    // 2. Backfill empty/NULL statuses (the silent 'failed' writes from before).
    const [result] = await pool.execute(
      `UPDATE orders SET status = 'failed' WHERE status = '' OR status IS NULL`
    );
    console.log(`Backfilled ${result.affectedRows} order(s) with empty status -> 'failed'`);

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();