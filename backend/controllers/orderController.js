const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const Product = require('../models/Product');
const SalaryCycle = require('../models/SalaryCycle');
const WalletTransaction = require('../models/WalletTransaction');
const Settings = require('../models/Settings');
const { resumePausedCycles } = require('./salaryController');
const emailService = require('../utils/emailService');
const { generateInvoiceNumber } = require('../utils/helpers');
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

    // Check if user already has active package
    if (user.has_active_package) {
      const repurchaseEnabled = await Settings.get('repurchase_enabled');
      if (repurchaseEnabled !== 'true') {
        await connection.rollback();
        return res.status(400).json({ message: 'You already have an active package' });
      }
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

    // Generate invoice number with new format: BSW + sequential + userId
    const invoiceNumber = await generateInvoiceNumber(connection, userId); //here

    // Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, 'wallet', 'processing', ?)`,
      [userId, product.id, product.price, invoiceNumber] //here
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

    // Set user active package
    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    console.log('User package activated');

    // Create salary cycle for referrer
    if (user.referred_by) {
      try {
        const wasInactive = !user.has_active_package;

        // Get referrer
        const [referrerRows] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [user.referred_by]
        );
        const referrer = referrerRows[0];

        if (referrer && referrer.has_active_package) {
          // Check if a salary cycle already exists for this referral
          const [existingCycles] = await connection.execute(
            'SELECT id FROM salary_cycles WHERE referral_id = ?',
            [userId]
          );

          if (existingCycles.length === 0) {
            // Use product-specific salary settings
            const productSalaryAmount = product.salary_amount || 100;
            const productSalaryDuration = product.salary_duration || 12;
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            await connection.execute(
              `INSERT INTO salary_cycles (sponsor_id, referral_id, start_month, monthly_amount, duration, status)
               VALUES (?, ?, ?, ?, ?, 'active')`,
              [user.referred_by, userId, startMonth, productSalaryAmount, productSalaryDuration]
            );

            console.log('Salary cycle created for referrer');
          }
        }

        // Resume paused cycles if user was previously inactive
        if (wasInactive) {
          await resumePausedCycles(userId);
        }
      } catch (cycleError) {
        console.error('Error creating salary cycle:', cycleError);
        // Don't fail the purchase for this
      }
    }

    // Commit transaction
    await connection.commit();

    console.log('Purchase completed successfully');

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

    console.log('[User Orders] Orders found:', orders.length);

    res.json({
      orders,
      page,
      limit
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

    // Check if user already has active package
    const user = await User.findById(userId);
    if (user.has_active_package) {
      const repurchaseEnabled = await Settings.get('repurchase_enabled');
      if (repurchaseEnabled !== 'true') {
        return res.status(400).json({ message: 'You already have an active package' });
      }
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

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(connection, userId);

    // Create order with 'processing' status (payment in progress)
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, 'razorpay', 'processing', ?)`,
      [userId, product.id, product.price, invoiceNumber]
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
      order_number: invoiceNumber,
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

    // Check if user already has active package
    if (user.has_active_package) {
      const repurchaseEnabled = await Settings.get('repurchase_enabled');
      if (repurchaseEnabled !== 'true') {
        await connection.rollback();
        return res.status(400).json({ message: 'You already have an active package' });
      }
    }

    // Find existing order from wallet_transactions using razorpay_order_id
    const [existingOrderRows] = await connection.execute(
      `SELECT wt.order_id, o.order_number
       FROM wallet_transactions wt
       JOIN orders o ON o.id = wt.order_id
       WHERE wt.payment_id = ? AND wt.user_id = ? AND wt.status = 'pending'`,
      [razorpay_order_id, userId]
    );

    let orderId;
    let invoiceNumber;

    if (existingOrderRows.length > 0) {
      // Update existing order to 'delivered' status
      orderId = existingOrderRows[0].order_id;
      invoiceNumber = existingOrderRows[0].order_number;

      await connection.execute(
        `UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = ?`,
        [orderId]
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

      console.log(`Updated existing order ${orderId} to delivered status`);
    } else {
      // Fallback: Create new order if no existing order found (shouldn't normally happen)
      console.warn(`No existing order found for razorpay_order_id: ${razorpay_order_id}, creating new order`);

      invoiceNumber = await generateInvoiceNumber(connection, userId);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, 'razorpay', 'delivered', ?)`,
        [userId, product.id, product.price, invoiceNumber]
      );
      orderId = orderResult.insertId;

      // Create wallet transaction record for the purchase
      await connection.execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, payment_id, order_id, status, description)
         VALUES (?, 'purchase', ?, ?, ?, 'completed', ?)`,
        [userId, -product.price, razorpay_payment_id, orderId, `Purchase: ${product.name}`]
      );
    }

    // Set user active package
    await connection.execute(
      'UPDATE users SET has_active_package = TRUE, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Create salary cycle for referrer
    if (user.referred_by) {
      try {
        // Get referrer
        const [referrerRows] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [user.referred_by]
        );
        const referrer = referrerRows[0];

        if (referrer && referrer.has_active_package) {
          // Check if a salary cycle already exists for this referral
          const [existingCycles] = await connection.execute(
            'SELECT id FROM salary_cycles WHERE referral_id = ?',
            [userId]
          );

          if (existingCycles.length === 0) {
            // Use product-specific salary settings
            const productSalaryAmount = product.salary_amount || 100;
            const productSalaryDuration = product.salary_duration || 12;
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            await connection.execute(
              `INSERT INTO salary_cycles (sponsor_id, referral_id, start_month, monthly_amount, duration, status)
               VALUES (?, ?, ?, ?, ?, 'active')`,
              [user.referred_by, userId, startMonth, productSalaryAmount, productSalaryDuration]
            );
          }
        }
      } catch (cycleError) {
        console.error('Error creating salary cycle:', cycleError);
        // Don't fail the purchase for this
      }
    }

    await connection.commit();

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
      amount: product.price
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
    let invoiceNumber;

    if (existingOrderRows.length > 0) {
      // Update existing order to 'failed' status
      orderId = existingOrderRows[0].order_id;
      invoiceNumber = existingOrderRows[0].order_number;

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
      // Fallback: Create new order if no existing order found
      console.warn(`No existing order found for cancelled payment, razorpay_order_id: ${razorpay_order_id}`);

      invoiceNumber = await generateInvoiceNumber(connection, userId);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, 'razorpay', 'failed', ?)`,
        [userId, product.id, product.price, invoiceNumber]
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
      order_id: orderId,
      order_number: invoiceNumber
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
    let invoiceNumber;
    const errorDesc = error_description || error_code || 'Payment failed';

    if (existingOrderRows.length > 0) {
      // Update existing order to 'failed' status
      orderId = existingOrderRows[0].order_id;
      invoiceNumber = existingOrderRows[0].order_number;

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
      // Fallback: Create new order if no existing order found
      console.warn(`No existing order found for failed payment, razorpay_order_id: ${razorpay_order_id}`);

      invoiceNumber = await generateInvoiceNumber(connection, userId);

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
         VALUES (?, ?, ?, 'razorpay', 'failed', ?)`,
        [userId, product.id, product.price, invoiceNumber]
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
      order_id: orderId,
      order_number: invoiceNumber
    });

  } catch (error) {
    await connection.rollback();
    console.error('Record failed payment error:', error);
    res.status(500).json({ message: 'Failed to record failed payment', error: error.message });
  } finally {
    connection.release();
  }
};