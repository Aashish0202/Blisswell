const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Resolve the design selection for a purchase. Returns the normalized
// design name (null for products without designs) or an error message.
// Products WITH designs require an explicit, matching design_name.
function resolveDesign(product, designName) {
  if (!designName) {
    if ((product.designs || []).length > 0) {
      return { error: 'Please select a design before purchasing' };
    }
    return { name: null };
  }
  const match = Product.findDesign(product, String(designName).trim());
  if (!match || !match.design) {
    return { error: `Invalid design selection for ${product.name}` };
  }
  return { name: match.design.name };
}
const WalletTransaction = require('../models/WalletTransaction');
const teamIncomeService = require('../services/teamIncomeService');
const emailService = require('../utils/emailService');
const { allocateInvoiceNumber } = require('../utils/helpers');
const { getUpgradeInfo } = require('./userController');
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

    // One-time purchase rule: a user buys a package once. Any higher rank is
    // upgraded exclusively through the auto-repurchase engine (repurchase
    // wallet), never by a second manual purchase.
    if (user.has_active_package) {
      await connection.rollback();
      return res.status(400).json({
        message: 'One-time purchase only: you already own a package. Higher ranks are upgraded automatically from your Repurchase Wallet.',
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
      `INSERT INTO orders (user_id, product_id, design_name, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, ?, 'wallet', 'pending', ?)`,
      [userId, product.id, design.name, product.price, invoiceNumber] //here
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

    // Next auto-upgrade info for the post-purchase popup
    const nextUpgrade = await getUpgradeInfo(userId);

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
      amount: product.price,
      nextUpgrade
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

    // Validate design selection (required for products that have designs) —
    // stored on the 'processing' order now and carried through verification.
    const design = resolveDesign(product, req.body.design_name);
    if (design.error) {
      return res.status(400).json({ message: design.error });
    }

    // One-time purchase rule (see purchaseProduct): second manual buys are
    // blocked — upgrades come from the auto-repurchase engine only.
    const user = await User.findById(userId);
    if (user.has_active_package) {
      return res.status(400).json({
        message: 'One-time purchase only: you already own a package. Higher ranks are upgraded automatically from your Repurchase Wallet.',
        error: 'ALREADY_PURCHASED'
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
      `INSERT INTO orders (user_id, product_id, design_name, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, ?, 'razorpay', 'processing', NULL)`,
      [userId, product.id, design.name, product.price]
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
  const connection = await pool.getConnection();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      product_id,
      design_name
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

    // Get product
    const product = await Product.getById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

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

    // One-time purchase rule (see purchaseProduct): blocks a second manual
    // buy even if a payment somehow reaches verification.
    if (user.has_active_package) {
      await connection.rollback();
      return res.status(400).json({
        message: 'One-time purchase only: you already own a package. Higher ranks are upgraded automatically from your Repurchase Wallet.',
        error: 'ALREADY_PURCHASED'
      });
    }

    // Find existing order from wallet_transactions using razorpay_order_id
    const [existingOrderRows] = await connection.execute(
      `SELECT wt.order_id, o.design_name
       FROM wallet_transactions wt
       JOIN orders o ON o.id = wt.order_id
       WHERE wt.payment_id = ? AND wt.user_id = ? AND wt.status = 'pending'`,
      [razorpay_order_id, userId]
    );

    let orderId;
    let invoiceNumber;

    // Design was already validated and stored on the 'processing' order in
    // createPaymentOrder. Only require the client to resend it for the
    // fallback path where no prior order row exists.
    const effectiveDesignName = design_name || (existingOrderRows[0] && existingOrderRows[0].design_name) || null;
    const design = resolveDesign(product, effectiveDesignName);
    if (design.error) {
      await connection.rollback();
      return res.status(400).json({ message: design.error });
    }

    if (existingOrderRows.length > 0) {
      // Payment verified — allocate the sequential invoice number NOW (the
      // only point an invoice is ever issued) and move the order to 'pending'
      // (awaiting shipment; admin marks shipped/delivered from the admin panel)
      orderId = existingOrderRows[0].order_id;
      invoiceNumber = await allocateInvoiceNumber(connection);

      await connection.execute(
        `UPDATE orders SET status = 'pending', order_number = ?, updated_at = NOW() WHERE id = ?`,
        [invoiceNumber, orderId]
      );

      // Update wallet transaction to completed
      await connection.execute(
        `UPDATE wallet_transactions
         SET status = 'completed',
             payment_id = ?,
             description = ?,
             amount = ?
         WHERE order_id = ? AND user_id = ?`,
        [razorpay_payment_id, `Purchase: ${product.name}`, -product.price, orderId, userId]
      );

      console.log(`Updated existing order ${orderId} to pending status (payment verified)`);
    } else {
      // Fallback: Create new order if no existing order found (shouldn't normally happen)
      console.warn(`No existing order found for razorpay_order_id: ${razorpay_order_id}, creating new order`);

      invoiceNumber = await allocateInvoiceNumber(connection);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, design_name, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, ?, 'razorpay', 'pending', ?)`,
        [userId, product.id, design.name, product.price, invoiceNumber]
      );
      orderId = orderResult.insertId;

      // Create wallet transaction record for the purchase
      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
         VALUES (?, 'purchase', ?, ?, ?, 'completed', ?)`,
        [userId, -product.price, razorpay_payment_id, orderId, `Purchase: ${product.name}`]
      );
    }

    // Set user active package + rank (initial purchase defines the rank)
    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
      [product.rank_name, product.id, userId]
    );

    // Team Income distribution (qualified upline, per the purchaser's rank table).
    await teamIncomeService.distributeForPurchase(connection, {
      purchaserId: userId,
      orderId,
      product
    });

    await connection.commit();

    // Next auto-upgrade info for the post-purchase popup
    const nextUpgrade = await getUpgradeInfo(userId);

    // Send purchase confirmation email
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
      amount: product.price,
      nextUpgrade
    });

  } catch (error) {
    await connection.rollback();
    console.error('Verify and purchase error:', error);
    res.status(500).json({ message: 'Purchase failed. Please contact support.', error: error.message });
  } finally {
    connection.release();
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