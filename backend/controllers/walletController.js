const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const pool = require('../config/db');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Settings = require('../models/Settings');

// Create Razorpay order for wallet deposit
exports.createDepositOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({
        message: 'Payment gateway not configured. Please contact support.',
        error: 'RAZORPAY_NOT_CONFIGURED'
      });
    }

    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: 'Minimum deposit amount is ₹100' });
    }

    // Get package settings
    const settings = await Settings.getPackageSettings();

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `wallet_${req.user.id}_${Date.now()}`,
      notes: {
        user_id: req.user.id.toString(),
        type: 'wallet_deposit'
      }
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      package_price: settings.package_price
    });
  } catch (error) {
    console.error('Create deposit order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// Verify and process payment
exports.verifyPayment = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await connection.beginTransaction();

    // Credit wallet
    const userId = req.user.id;
    await Wallet.updateBalance(userId, amount, connection);

    // Create transaction record
    await WalletTransaction.create({
      user_id: userId,
      type: 'deposit',
      amount: amount,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      status: 'completed',
      description: 'Wallet deposit via Razorpay'
    }, connection);

    await connection.commit();

    res.json({
      message: 'Payment successful. Wallet credited.',
      payment_id: razorpay_payment_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  } finally {
    connection.release();
  }
};

// Get wallet balance
exports.getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.getByUserId(req.user.id);

    res.json({
      balance: wallet?.balance || 0
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get transaction history
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const transactions = await WalletTransaction.getByUserId(req.user.id, page, limit);

    res.json({
      transactions,
      page,
      limit
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Razorpay webhook handler
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSign !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Handle payment captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const order = event.payload.order.entity;

      // Check if this is a wallet deposit
      if (order.notes && order.notes.type === 'wallet_deposit') {
        const userId = parseInt(order.notes.user_id);

        // Credit wallet
        await Wallet.updateBalance(userId, payment.amount / 100);

        // Create transaction record
        await WalletTransaction.create({
          user_id: userId,
          type: 'deposit',
          amount: payment.amount / 100,
          payment_id: payment.id,
          order_id: order.id,
          status: 'completed',
          description: 'Wallet deposit via Razorpay'
        });
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};