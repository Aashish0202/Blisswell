const pool = require('../config/db');
const Product = require('../models/Product');
const PaymentRequest = require('../models/PaymentRequest');
const teamIncomeService = require('./teamIncomeService');
const rewardService = require('./rewardService');
const emailService = require('../utils/emailService');
const { allocateInvoiceNumber } = require('../utils/helpers');

class QrPaymentError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Admin decisions on manual QR payment requests.
//
// Approve settles the purchase exactly like a captured Razorpay payment
// (see razorpayPurchaseService.settleCapturedPurchase): paid order in
// 'pending' (awaiting shipment) with a sequential invoice number, completed
// purchase txn, user activated with the product's rank, team income paid —
// all in one transaction, so invoices/income/order lists behave identically.
const qrPaymentService = {
  async approve(adminId, id) {
    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();

      const [reqRows] = await connection.execute(
        'SELECT * FROM payment_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      const pr = reqRows[0];
      if (!pr) { await connection.rollback(); throw new QrPaymentError(404, 'Payment request not found', 'NOT_FOUND'); }
      if (pr.status !== 'pending') {
        await connection.rollback();
        throw new QrPaymentError(409, `Payment request is already ${pr.status}`, 'NOT_PENDING');
      }

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE id = ? FOR UPDATE',
        [pr.user_id]
      );
      const user = userRows[0];
      if (!user) { await connection.rollback(); throw new QrPaymentError(404, 'User not found', 'USER_NOT_FOUND'); }
      if (user.has_active_package) {
        await connection.rollback();
        throw new QrPaymentError(409, 'This user already owns the package (paid another way). Reject this request and refund the payment manually.', 'USER_ALREADY_ACTIVE');
      }

      const product = await Product.getById(pr.product_id);
      if (!product) throw new Error(`Product ${pr.product_id} not found for payment request ${id}`);

      const invoiceNumber = await allocateInvoiceNumber(connection);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, design_name, design_image, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, ?, ?, 'qr', 'pending', ?)`,
        [user.id, product.id, pr.design_name, pr.design_image, pr.amount, invoiceNumber]
      );
      const orderId = orderResult.insertId;

      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
         VALUES (?, 'purchase', ?, ?, ?, 'completed', ?)`,
        [user.id, -pr.amount, `UTR-${pr.utr}`, orderId, `Purchase (QR/UPI): ${product.name}`]
      );

      await connection.execute(
        'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
        [product.rank_name, product.id, user.id]
      );

      await teamIncomeService.distributeForPurchase(connection, {
        purchaserId: user.id,
        orderId,
        product
      });

      await connection.execute(
        `UPDATE payment_requests
            SET status = 'approved', order_id = ?, reviewed_by = ?, reviewed_at = NOW()
          WHERE id = ?`,
        [orderId, adminId, id]
      );

      await connection.commit();
      rewardService.scheduleActivation(user.id); // milestone rewards, after commit
      result = { orderId, invoiceNumber, user, product, amount: pr.amount };
    } catch (error) {
      try { await connection.rollback(); } catch (_) {}
      throw error;
    } finally {
      connection.release();
    }

    emailService.sendQrPaymentApprovedEmail(
      { name: result.user.name, email: result.user.email },
      { productName: result.product.name, amount: result.amount, invoiceNumber: result.invoiceNumber }
    ).catch(err => console.error('QR approval email error:', err));

    return PaymentRequest.findById(id);
  },

  async reject(adminId, id, reason) {
    const trimmed = String(reason || '').trim();
    if (!trimmed) throw new QrPaymentError(400, 'A rejection reason is required', 'REASON_REQUIRED');

    const [res] = await pool.execute(
      `UPDATE payment_requests
          SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ? AND status = 'pending'`,
      [trimmed.slice(0, 500), adminId, id]
    );
    const pr = await PaymentRequest.findById(id);
    if (!pr) throw new QrPaymentError(404, 'Payment request not found', 'NOT_FOUND');
    if (res.affectedRows === 0) throw new QrPaymentError(409, `Payment request is already ${pr.status}`, 'NOT_PENDING');

    emailService.sendQrPaymentRejectedEmail(
      { name: pr.user_name, email: pr.user_email },
      { productName: pr.product_name, amount: pr.amount, utr: pr.utr, reason: trimmed }
    ).catch(err => console.error('QR rejection email error:', err));

    return pr;
  }
};

module.exports = { qrPaymentService, QrPaymentError };
