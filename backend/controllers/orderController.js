const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Resolve the design selection for a purchase. Returns the normalized
// design name + image snapshot (nulls for products without designs) or an
// error message. Products WITH designs require an explicit, matching
// design_name. Out-of-stock designs are rejected unless allowOutOfStock is
// set — used after payment, where the buyer has already paid and must not
// be bounced because the admin flagged the design in the meantime.
function resolveDesign(product, designName, { allowOutOfStock = false } = {}) {
  if (!designName) {
    if ((product.designs || []).length > 0) {
      return { error: 'Please select a design before purchasing' };
    }
    return { name: null, image: null };
  }
  const match = Product.findDesign(product, String(designName).trim());
  if (!match || !match.design) {
    return { error: `Invalid design selection for ${product.name}` };
  }
  if (match.design.out_of_stock && !allowOutOfStock) {
    return { error: `${match.design.name} is out of stock. Please select another design.` };
  }
  return { name: match.design.name, image: match.design.images[0] || null };
}
exports.resolveDesign = resolveDesign;

// Only the main package is sold; every other product is display-only
// ("repurchase product — repurchase coming soon").
const NOT_PURCHASABLE = {
  message: 'This is a repurchase product. Repurchase is coming soon.',
  error: 'NOT_PURCHASABLE'
};
const WalletTransaction = require('../models/WalletTransaction');
const teamIncomeService = require('../services/teamIncomeService');
const rewardService = require('../services/rewardService');
const emailService = require('../utils/emailService');
const { allocateInvoiceNumber } = require('../utils/helpers');
const { settleCapturedPurchase } = require('../services/razorpayPurchaseService');
const Settings = require('../models/Settings');
const PaymentRequest = require('../models/PaymentRequest');
const crypto = require('crypto');
const razorpay = require('../config/razorpay');

// Purchase product using wallet balance
exports.purchaseProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { product_id } = req.body;
    const userId = req.user.id;

    console.log(`Purchase attempt: User ${userId}, Product ${product_id}`);

    // Validate product_id
    if (!product_id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product
    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!product.is_active) {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }
    if (!product.is_purchasable) {
      return res.status(400).json(NOT_PURCHASABLE);
    }

    console.log(`Product: ${product.name}, Price: ${product.price}`);

    // Validate design selection (required for products that have designs)
    const design = resolveDesign(product, req.body.design_name);
    if (design.error) {
      return res.status(400).json({ message: design.error });
    }

    // Start transaction
    await connection.beginTransaction();

    // Get user with lock
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    const user = userRows[0];

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`User: ${user.email}, PAN: ${user.pan_status}, Has package: ${user.has_active_package}`);

    // One-time purchase rule: a user buys the package once.
    if (user.has_active_package) {
      await connection.rollback();
      return res.status(400).json({
        message: 'One-time purchase only: you have already purchased the package.',
        error: 'ALREADY_PURCHASED'
      });
    }

    // Get wallet with lock
    const [walletRows] = await connection.execute(
      'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
      [userId]
    );
    const wallet = walletRows[0];

    if (!wallet) {
      await connection.rollback();
      return res.status(400).json({ message: 'Wallet not found. Please contact support.' });
    }

    console.log(`Wallet balance: ${wallet.balance}, Product price: ${product.price}`);

    // Check wallet balance
    if (parseFloat(wallet.balance) < parseFloat(product.price)) {
      await connection.rollback();
      return res.status(400).json({
        message: `Insufficient wallet balance. Required: ₹${product.price}, Available: ₹${wallet.balance}`,
        error: 'INSUFFICIENT_BALANCE',
        required: product.price,
        available: wallet.balance
      });
    }

    // Deduct from wallet
    const [deductResult] = await connection.execute(
      'UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE user_id = ? AND balance >= ?',
      [product.price, userId, product.price]
    );

    if (deductResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Failed to deduct balance. Please try again.' });
    }

    console.log('Balance deducted successfully');

    // Allocate invoice number — wallet payment settles in this same
    // transaction, so the invoice is issued only on confirmed payment.
    const invoiceNumber = await allocateInvoiceNumber(connection);

    // Create order. Payment is settled instantly (wallet balance deducted and
    // the package activated in this transaction), but the delivery status
    // starts as 'pending' — admin sets shipped/delivered from the admin panel
    // as the product actually ships. 'processing' is reserved for gateway
    // payments that are still pending verification.
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, design_name, design_image, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, ?, ?, 'wallet', 'pending', ?)`,
      [userId, product.id, design.name, design.image, product.price, invoiceNumber] //here
    );
    const orderId = orderResult.insertId;

    console.log(`Order created: ${orderId}`);

    // Create transaction record
    await connection.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description)
       VALUES (?, 'purchase', ?, 'completed', ?)`,
      [userId, -product.price, `Purchase: ${product.name}`]
    );

    console.log('Transaction record created');

    // Set user active package + rank (initial purchase defines the rank)
    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
      [product.rank_name, product.id, userId]
    );

    console.log('User package activated');

    // Distribute Team Income to qualified upline. Runs inside the purchase
    // transaction so the purchase and its income effects commit atomically.
    await teamIncomeService.distributeForPurchase(connection, {
      purchaserId: userId,
      orderId,
      product
    });

    // Commit transaction
    await connection.commit();

    console.log('Purchase completed successfully');

    // Milestone rewards: recompute this member + 6 uplines (after commit).
    rewardService.scheduleActivation(userId);


    // Send purchase confirmation email (don't await to not block response)
    emailService.sendPurchaseEmail(
      { name: user.name, email: user.email },
      { id: orderId, total_amount: product.price },
      product
    ).catch(err => console.error('Purchase email error:', err));

    res.json({
      success: true,
      message: 'Purchase successful!',
      order_id: orderId,
      product_name: product.name,
      amount: product.price
    });

  } catch (error) {
    await connection.rollback();
    console.error('Purchase error:', error);
    res.status(500).json({
      message: 'Purchase failed. Please try again or contact support.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get orders for user
exports.getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    console.log('[User Orders] Fetching orders for user:', req.user.id);

    const orders = await Order.getByUserId(req.user.id, page, limit);
    const total = await Order.countByUserId(req.user.id);

    console.log('[User Orders] Orders found:', orders.length, 'Total:', total);

    res.json({
      orders,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.getById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to user
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.getAll(true);

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create Razorpay order for direct product purchase
exports.createPaymentOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        message: 'Payment gateway not configured. Please contact support.',
        error: 'RAZORPAY_NOT_CONFIGURED'
      });
    }

    if (!(await Settings.getPaymentSettings()).razorpayEnabled) {
      return res.status(400).json({
        message: 'Online payment is currently unavailable. Please use another payment option.',
        error: 'RAZORPAY_DISABLED'
      });
    }

    const { product_id } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product
    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!product.is_active) {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }
    if (!product.is_purchasable) {
      return res.status(400).json(NOT_PURCHASABLE);
    }

    // Validate design selection (required for products that have designs) —
    // stored on the 'processing' order now and carried through verification.
    const design = resolveDesign(product, req.body.design_name);
    if (design.error) {
      return res.status(400).json({ message: design.error });
    }

    // One-time purchase rule (see purchaseProduct).
    const user = await User.findById(userId);
    if (user.has_active_package) {
      return res.status(400).json({
        message: 'One-time purchase only: you have already purchased the package.',
        error: 'ALREADY_PURCHASED'
      });
    }
    // A QR payment awaiting admin review would be a second payment.
    if (await PaymentRequest.getPendingForUser(userId)) {
      return res.status(400).json({
        message: 'You already have a QR payment awaiting admin approval.',
        error: 'REQUEST_PENDING'
      });
    }

    const amount = parseFloat(product.price);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `product_${product_id}_user_${userId}_${Date.now()}`,
      notes: {
        user_id: userId.toString(),
        product_id: product_id.toString(),
        product_name: product.name,
        type: 'product_purchase'
      }
    });

    await connection.beginTransaction();

    // Create order with 'processing' status (payment in progress).
    // NO invoice number yet — invoices are allocated only in verifyAndPurchase
    // when the payment is actually confirmed, so failed/abandoned payments
    // never consume a sequential number.
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, design_name, design_image, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, ?, ?, 'razorpay', 'processing', NULL)`,
      [userId, product.id, design.name, design.image, product.price]
    );
    const orderId = orderResult.insertId;

    // Store razorpay_order_id in wallet_transactions for tracking
    await connection.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
       VALUES (?, 'purchase', ?, ?, ?, 'pending', ?)`,
      [userId, product.price, razorpayOrder.id, orderId, `Payment initiated: ${product.name}`]
    );

    await connection.commit();

    res.json({
      order_id: razorpayOrder.id,
      internal_order_id: orderId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      product: {
        id: product.id,
        name: product.name,
        price: product.price
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create payment order error:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  } finally {
    connection.release();
  }
};

// Verify Razorpay payment and create order
exports.verifyAndPurchase = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      product_id
    } = req.body;

    const userId = req.user.id;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Settle through the shared service (same path as the Razorpay webhook),
    // so whichever of browser callback / webhook arrives second is a no-op.
    const result = await settleCapturedPurchase({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      expectedUserId: userId
    });

    if (result.status === 'not_found') {
      // No 'processing' order row for this Razorpay order (shouldn't normally happen)
      return verifyWithoutOrderRow(req, res);
    }
    if (result.status === 'user_already_active') {
      return res.status(400).json({
        message: 'One-time purchase only: you have already purchased the package.',
        error: 'ALREADY_PURCHASED'
      });
    }
    if (result.status !== 'settled' && result.status !== 'already_settled') {
      console.error(`verifyAndPurchase: ${result.status} for ${razorpay_order_id} (user ${userId})`);
      return res.status(400).json({ message: 'Payment could not be matched to your order. Please contact support.' });
    }

    const product = result.product || await Product.getById(product_id);


    if (result.status === 'settled') {
      emailService.sendPurchaseEmail(
        { name: result.user.name, email: result.user.email },
        { id: result.orderId, total_amount: product.price },
        product
      ).catch(err => console.error('Purchase email error:', err));
    }

    res.json({
      success: true,
      message: 'Purchase successful!',
      order_id: result.orderId,
      order_number: result.invoiceNumber,
      product_name: product && product.name,
      amount: product && product.price
    });
  } catch (error) {
    console.error('Verify and purchase error:', error);
    res.status(500).json({ message: 'Purchase failed. Please contact support.', error: error.message });
  }
};

// Fallback for verifyAndPurchase when no order row exists for the Razorpay
// order: create the order from the request (signature already verified).
async function verifyWithoutOrderRow(req, res) {
  const connection = await pool.getConnection();

  try {
    const { razorpay_order_id, razorpay_payment_id, product_id, design_name } = req.body;
    const userId = req.user.id;

    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Payment already captured — accept the design even if it was flagged
    // out of stock after checkout started.
    const design = resolveDesign(product, design_name, { allowOutOfStock: true });
    if (design.error) {
      return res.status(400).json({ message: design.error });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    const user = userRows[0];

    if (!user) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.has_active_package) {
      await connection.rollback();
      return res.status(400).json({
        message: 'One-time purchase only: you have already purchased the package.',
        error: 'ALREADY_PURCHASED'
      });
    }

    console.warn(`No existing order found for razorpay_order_id: ${razorpay_order_id}, creating new order`);

    const invoiceNumber = await allocateInvoiceNumber(connection);

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, design_name, design_image, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, ?, ?, 'razorpay', 'pending', ?)`,
      [userId, product.id, design.name, design.image, product.price, invoiceNumber]
    );
    const orderId = orderResult.insertId;

    await connection.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
       VALUES (?, 'purchase', ?, ?, ?, 'completed', ?)`,
      [userId, -product.price, razorpay_payment_id, orderId, `Purchase: ${product.name}`]
    );

    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
      [product.rank_name, product.id, userId]
    );

    await teamIncomeService.distributeForPurchase(connection, {
      purchaserId: userId,
      orderId,
      product
    });

    await connection.commit();
    rewardService.scheduleActivation(userId);


    emailService.sendPurchaseEmail(
      { name: user.name, email: user.email },
      { id: orderId, total_amount: product.price },
      product
    ).catch(err => console.error('Purchase email error:', err));

    res.json({
      success: true,
      message: 'Purchase successful!',
      order_id: orderId,
      order_number: invoiceNumber,
      product_name: product.name,
      amount: product.price
    });
  } catch (error) {
    await connection.rollback();
    console.error('Verify and purchase error:', error);
    res.status(500).json({ message: 'Purchase failed. Please contact support.', error: error.message });
  } finally {
    connection.release();
  }
}

// Razorpay webhook for product purchases (payment.captured / order.paid).
// Server-to-server backup for verifyAndPurchase: activates the purchase even
// if the buyer's browser never came back from checkout. Signature is checked
// against the raw request body (req.rawBody, captured in server.js).
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    if (!secret || !signature || !req.rawBody) {
      return res.status(400).json({ message: 'Invalid webhook request' });
    }

    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;
    if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
      return res.json({ status: 'ignored' });
    }

    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (!payment || !payment.order_id || payment.status !== 'captured') {
      return res.json({ status: 'ignored' });
    }

    const result = await settleCapturedPurchase({
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      amountPaise: payment.amount
    });

    if (result.status === 'settled') {
      console.log(`[razorpayWebhook] Settled order ${result.orderId} (${result.invoiceNumber}) for ${payment.order_id} / ${payment.id}`);
      emailService.sendPurchaseEmail(
        { name: result.user.name, email: result.user.email },
        { id: result.orderId, total_amount: result.product.price },
        result.product
      ).catch(err => console.error('Purchase email error:', err));
    } else if (result.status !== 'already_settled' && result.status !== 'not_found') {
      // not_found = not a product purchase (e.g. wallet deposit) — ignore quietly
      console.error(`[razorpayWebhook] NEEDS REVIEW: ${result.status} for ${payment.order_id} / ${payment.id} (order ${result.orderId})`);
    }

    // Always 200 once the signature is valid, so Razorpay doesn't retry
    // events that can never succeed; review cases are logged above.
    res.json({ status: result.status });
  } catch (error) {
    // 5xx makes Razorpay retry — right for transient DB errors
    console.error('[razorpayWebhook] Error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Record cancelled payment
exports.recordCancelledPayment = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { product_id, razorpay_order_id, reason } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product
    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await connection.beginTransaction();

    // Find existing order from wallet_transactions using razorpay_order_id
    const [existingOrderRows] = await connection.execute(
      `SELECT wt.order_id, o.order_number
       FROM wallet_transactions wt
       JOIN orders o ON o.id = wt.order_id
       WHERE wt.payment_id = ? AND wt.user_id = ? AND wt.status = 'pending'`,
      [razorpay_order_id, userId]
    );

    let orderId;

    if (existingOrderRows.length > 0) {
      // Update existing order to 'failed' status
      orderId = existingOrderRows[0].order_id;

      await connection.execute(
        `UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [orderId]
      );

      // Update wallet transaction to failed
      await connection.execute(
        `UPDATE wallet_transactions
         SET status = 'failed',
             description = ?
         WHERE order_id = ? AND user_id = ?`,
        [`Payment cancelled: ${product.name}${reason ? ' - ' + reason : ''}`, orderId, userId]
      );

      console.log(`Updated existing order ${orderId} to failed status (cancelled)`);
    } else {
      // Fallback: Create new order if no existing order found.
      // No invoice number — a cancelled payment is never invoiced.
      console.warn(`No existing order found for cancelled payment, razorpay_order_id: ${razorpay_order_id}`);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, 'razorpay', 'failed', NULL)`,
        [userId, product.id, product.price]
      );
      orderId = orderResult.insertId;

      // Create wallet transaction record for tracking
      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
         VALUES (?, 'purchase', ?, ?, ?, 'failed', ?)`,
        [userId, 0, razorpay_order_id || null, orderId, `Payment cancelled: ${product.name}${reason ? ' - ' + reason : ''}`]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Cancelled payment recorded',
      order_id: orderId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Record cancelled payment error:', error);
    res.status(500).json({ message: 'Failed to record cancelled payment', error: error.message });
  } finally {
    connection.release();
  }
};

// Record failed payment
exports.recordFailedPayment = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { product_id, razorpay_order_id, error_code, error_description } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Get product
    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await connection.beginTransaction();

    // Find existing order from wallet_transactions using razorpay_order_id
    const [existingOrderRows] = await connection.execute(
      `SELECT wt.order_id, o.order_number
       FROM wallet_transactions wt
       JOIN orders o ON o.id = wt.order_id
       WHERE wt.payment_id = ? AND wt.user_id = ? AND wt.status = 'pending'`,
      [razorpay_order_id, userId]
    );

    let orderId;
    const errorDesc = error_description || error_code || 'Payment failed';

    if (existingOrderRows.length > 0) {
      // Update existing order to 'failed' status
      orderId = existingOrderRows[0].order_id;

      await connection.execute(
        `UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [orderId]
      );

      // Update wallet transaction to failed
      await connection.execute(
        `UPDATE wallet_transactions
         SET status = 'failed',
             description = ?
         WHERE order_id = ? AND user_id = ?`,
        [`Payment failed: ${product.name} - ${errorDesc}`, orderId, userId]
      );

      console.log(`Updated existing order ${orderId} to failed status`);
    } else {
      // Fallback: Create new order if no existing order found.
      // No invoice number — a failed payment is never invoiced.
      console.warn(`No existing order found for failed payment, razorpay_order_id: ${razorpay_order_id}`);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, 'razorpay', 'failed', NULL)`,
        [userId, product.id, product.price]
      );
      orderId = orderResult.insertId;

      // Create wallet transaction record for tracking
      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
         VALUES (?, 'purchase', ?, ?, ?, 'failed', ?)`,
        [userId, 0, razorpay_order_id || null, orderId, `Payment failed: ${product.name} - ${errorDesc}`]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Failed payment recorded',
      order_id: orderId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Record failed payment error:', error);
    res.status(500).json({ message: 'Failed to record failed payment', error: error.message });
  } finally {
    connection.release();
  }
};