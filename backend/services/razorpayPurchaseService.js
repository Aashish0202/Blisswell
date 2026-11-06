const pool = require('../config/db');
const Product = require('../models/Product');
const teamIncomeService = require('./teamIncomeService');
const rewardService = require('./rewardService');
const { allocateInvoiceNumber } = require('../utils/helpers');

// Settles a captured Razorpay product payment: order -> 'pending' (paid,
// awaiting shipment) with a sequential invoice number, purchase txn ->
// 'completed', user activated with the product's rank, team income paid.
//
// Shared by all three ways a captured payment can reach us:
//   - verifyAndPurchase (browser callback after checkout)
//   - the Razorpay webhook (payment.captured / order.paid)
//   - scripts/reconcileRazorpayPurchases.js (manual recovery)
// so a purchase is activated exactly once no matter which arrives first.
//
// The order is located via the purchase wallet_transactions row, whose
// payment_id holds the Razorpay order id until settlement (then the pay_ id).
// Orders the expiry cron or the record-failed/cancelled endpoints already
// marked 'failed' are still settled — the money was captured.
//
// Returns { status, orderId, invoiceNumber, product, user } where status is:
//   'settled'          — activated now
//   'already_settled'  — this payment was settled earlier (idempotent no-op)
//   'not_found'        — no purchase order for this Razorpay order id
//   'user_mismatch'    — order belongs to another user than expectedUserId
//   'amount_mismatch'  — captured amount differs from the order amount
//   'user_already_active' — the user already owns a package via another
//                        order; this payment needs a manual refund/review
async function settleCapturedPurchase({
  razorpayOrderId,
  razorpayPaymentId,
  amountPaise = null,
  expectedUserId = null
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [txRows] = await connection.execute(
      `SELECT wt.id AS txn_id, wt.status AS txn_status, o.id AS order_id,
              o.user_id, o.product_id, o.amount, o.status AS order_status, o.order_number
       FROM wallet_transactions wt
       JOIN orders o ON o.id = wt.order_id
       WHERE wt.type = 'purchase' AND wt.payment_id IN (?, ?)
       ORDER BY wt.id
       LIMIT 1
       FOR UPDATE`,
      [razorpayOrderId, razorpayPaymentId || razorpayOrderId]
    );
    const row = txRows[0];

    if (!row) {
      await connection.rollback();
      return { status: 'not_found' };
    }
    if (expectedUserId && Number(row.user_id) !== Number(expectedUserId)) {
      await connection.rollback();
      return { status: 'user_mismatch', orderId: row.order_id };
    }
    if (row.txn_status === 'completed' || row.order_number) {
      await connection.rollback();
      return { status: 'already_settled', orderId: row.order_id, invoiceNumber: row.order_number };
    }
    if (amountPaise != null && Math.round(parseFloat(row.amount) * 100) !== Number(amountPaise)) {
      await connection.rollback();
      return { status: 'amount_mismatch', orderId: row.order_id };
    }

    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [row.user_id]
    );
    const user = userRows[0];
    if (user.has_active_package) {
      await connection.rollback();
      return { status: 'user_already_active', orderId: row.order_id, user };
    }

    const product = await Product.getById(row.product_id);
    if (!product) throw new Error(`Product ${row.product_id} not found for order ${row.order_id}`);

    const invoiceNumber = await allocateInvoiceNumber(connection);

    await connection.execute(
      `UPDATE orders SET status = 'pending', order_number = ?, updated_at = NOW() WHERE id = ?`,
      [invoiceNumber, row.order_id]
    );
    await connection.execute(
      `UPDATE wallet_transactions
       SET status = 'completed', payment_id = ?, description = ?, amount = ?
       WHERE id = ?`,
      [razorpayPaymentId || razorpayOrderId, `Purchase: ${product.name}`, -product.price, row.txn_id]
    );
    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
      [product.rank_name, product.id, user.id]
    );
    await teamIncomeService.distributeForPurchase(connection, {
      purchaserId: user.id,
      orderId: row.order_id,
      product
    });

    await connection.commit();
    rewardService.scheduleActivation(user.id); // milestone rewards, after commit
    return { status: 'settled', orderId: row.order_id, invoiceNumber, product, user };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { settleCapturedPurchase };
