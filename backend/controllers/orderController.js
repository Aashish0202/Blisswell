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

    // Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, 'wallet', 'processing', ?)`,
      [userId, product.id, product.price, `ORD${Date.now()}${userId}`]
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

    const orders = await Order.getByUserId(req.user.id, page, limit);

    res.json({
      orders,
      page,
      limit
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
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