/**
 * One-off script to expire orders stuck in 'processing' (payment initiated
 * but never completed). Marks them 'failed' and fails their matching pending
 * 'purchase' wallet_transactions.
 *
 * Run from the production server (where the DB is reachable):
 *   node scripts/expireOrders.js            # uses default 30-min window
 *   node scripts/expireOrders.js 15         # custom window (minutes)
 */
const Order = require('../models/Order');

(async () => {
  const minutes = parseInt(process.argv[2], 10);
  const timeoutMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;

  try {
    const result = await Order.expireStuckProcessingOrders(timeoutMinutes);
    console.log(`Timeout window: > ${timeoutMinutes} min(s) in 'processing'`);
    if (result.count === 0) {
      console.log('No stuck orders found. Nothing to expire.');
    } else {
      console.log(`Marked ${result.count} abandoned order(s) as 'failed'.`);
      console.log('Order IDs:', result.order_ids.join(', '));
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to expire stuck orders:', err.message);
    process.exit(1);
  }
})();