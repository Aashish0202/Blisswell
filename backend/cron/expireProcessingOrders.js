const cron = require('node-cron');
const Order = require('../models/Order');

// Orders are created with status='processing' when a user opens the Razorpay
// payment page. If they leave without paying, the order is never verified and
// stays 'processing' forever (its wallet_transactions row stays 'pending').
// This cron periodically marks such abandoned orders as 'failed' after a
// configurable timeout so they don't pile up.
const EXPIRE_AFTER_MINUTES = parseInt(process.env.ORDER_EXPIRE_MINUTES || '30', 10);
// Run every 10 minutes (at xx:08, xx:18, xx:28, ...). Off-minute to avoid the
// fleet-wide :00/:30 stampede.
const CRON_EXPRESSION = '8,18,28,38,48,58 * * * *';

const expireProcessingOrders = async () => {
  try {
    const result = await Order.expireStuckProcessingOrders(EXPIRE_AFTER_MINUTES);
    if (result.count > 0) {
      console.log(
        `[expireProcessingOrders] Marked ${result.count} abandoned order(s) as failed ` +
          `(stuck in 'processing' for > ${EXPIRE_AFTER_MINUTES} min): [${result.order_ids.join(', ')}]`
      );
    }
  } catch (error) {
    console.error('[expireProcessingOrders] Error expiring stuck orders:', error);
  }
};

const initExpireProcessingOrdersCron = () => {
  cron.schedule(CRON_EXPRESSION, expireProcessingOrders, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log(
    `Abandoned-order expiry cron scheduled (${CRON_EXPRESSION}) — ` +
      `orders stuck in 'processing' for > ${EXPIRE_AFTER_MINUTES} min will be marked 'failed'.`
  );
};

module.exports = {
  initExpireProcessingOrdersCron,
  expireProcessingOrders
};