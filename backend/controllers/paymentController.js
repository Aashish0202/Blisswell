const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const PaymentRequest = require('../models/PaymentRequest');
const SettingAuditLog = require('../models/SettingAuditLog');
const pool = require('../config/db');
const { resolveDesign } = require('./orderController');
const { qrPaymentService } = require('../services/qrPaymentService');

const UTR_PATTERN = /^[A-Za-z0-9]{6,30}$/;

// Remove an uploaded screenshot when the submission is rejected up front.
const discardUpload = (file) => {
  if (file && file.path) fs.unlink(file.path, () => {});
};

// ==================== USER ====================

// Which payment methods are open + the QR details to show (logged-in users).
exports.getPaymentConfig = async (req, res) => {
  try {
    const p = await Settings.getPaymentSettings();
    const qrReady = p.qrEnabled && !!p.qrImage;
    res.json({
      razorpay: { enabled: p.razorpayEnabled },
      qr: {
        enabled: qrReady,
        image: qrReady ? p.qrImage : '',
        upiId: qrReady ? p.upiId : '',
        payeeName: qrReady ? p.payeeName : ''
      }
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User submits a QR payment: product + design + UTR + screenshot (multipart).
exports.submitQrPayment = async (req, res) => {
  const file = req.file;
  try {
    const userId = req.user.id;
    const productId = parseInt(req.body.product_id, 10);
    const utr = String(req.body.utr || '').trim().replace(/\s+/g, '');

    if (!file) return res.status(400).json({ message: 'Please attach the payment screenshot' });
    if (!productId) { discardUpload(file); return res.status(400).json({ message: 'Product ID is required' }); }
    if (!UTR_PATTERN.test(utr)) {
      discardUpload(file);
      return res.status(400).json({ message: 'Enter a valid transaction ID / UTR (letters and numbers only, 6-30 characters)' });
    }

    const payment = await Settings.getPaymentSettings();
    if (!payment.qrEnabled || !payment.qrImage) {
      discardUpload(file);
      return res.status(400).json({ message: 'QR payment is currently unavailable', error: 'QR_DISABLED' });
    }

    const product = await Product.getById(productId);
    if (!product || !product.is_active) {
      discardUpload(file);
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }
    if (!product.is_purchasable) {
      discardUpload(file);
      return res.status(400).json({ message: 'This is a repurchase product. Repurchase is coming soon.', error: 'NOT_PURCHASABLE' });
    }

    const design = resolveDesign(product, req.body.design_name);
    if (design.error) { discardUpload(file); return res.status(400).json({ message: design.error }); }

    const user = await User.findById(userId);
    if (user.has_active_package) {
      discardUpload(file);
      return res.status(400).json({ message: 'You have already purchased the package.', error: 'ALREADY_PURCHASED' });
    }
    if (await PaymentRequest.getPendingForUser(userId)) {
      discardUpload(file);
      return res.status(400).json({ message: 'You already have a payment awaiting admin approval.', error: 'REQUEST_PENDING' });
    }
    if (await PaymentRequest.findByUtr(utr)) {
      discardUpload(file);
      return res.status(400).json({ message: 'This transaction ID / UTR has already been submitted.', error: 'DUPLICATE_UTR' });
    }

    const id = await PaymentRequest.create({
      user_id: userId,
      product_id: product.id,
      design_name: design.name,
      design_image: design.image,
      amount: product.price,
      utr,
      screenshot: `/uploads/payment-proofs/${file.filename}`
    });

    res.status(201).json({
      success: true,
      message: 'Payment submitted. Your order will be confirmed once the admin verifies it.',
      request_id: id
    });
  } catch (error) {
    discardUpload(file);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This transaction ID / UTR has already been submitted.', error: 'DUPLICATE_UTR' });
    }
    console.error('Submit QR payment error:', error);
    res.status(500).json({ message: 'Failed to submit payment. Please try again.' });
  }
};

exports.getMyQrPayments = async (req, res) => {
  try {
    const requests = await PaymentRequest.getByUser(req.user.id);
    res.json({ requests });
  } catch (error) {
    console.error('Get my QR payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== ADMIN ====================

exports.adminListQrPayments = async (req, res) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const search = (req.query.search || '').trim() || null;

    const { requests, total } = await PaymentRequest.getAll({ status, search, page, limit });
    const pendingCount = await PaymentRequest.countPending();
    res.json({ requests, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), pendingCount });
  } catch (error) {
    console.error('Admin list QR payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminApproveQrPayment = async (req, res) => {
  try {
    const request = await qrPaymentService.approve(req.user.id, parseInt(req.params.id, 10));
    res.json({ message: `Payment approved — order ${request.order_number} created`, request });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, error: error.code });
    console.error('Approve QR payment error:', error);
    res.status(500).json({ message: 'Failed to approve payment' });
  }
};

exports.adminRejectQrPayment = async (req, res) => {
  try {
    const request = await qrPaymentService.reject(req.user.id, parseInt(req.params.id, 10), req.body.reason);
    res.json({ message: 'Payment request rejected', request });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, error: error.code });
    console.error('Reject QR payment error:', error);
    res.status(500).json({ message: 'Failed to reject payment' });
  }
};

exports.adminGetPaymentSettings = async (req, res) => {
  try {
    res.json({ settings: await Settings.getPaymentSettings() });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payment method toggles + QR details. Audited like income settings.
exports.adminUpdatePaymentSettings = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const b = req.body || {};
    const current = await Settings.getPaymentSettings();
    const next = {
      payment_razorpay_enabled: b.razorpayEnabled !== undefined ? String(!!b.razorpayEnabled) : String(current.razorpayEnabled),
      payment_qr_enabled: b.qrEnabled !== undefined ? String(!!b.qrEnabled) : String(current.qrEnabled),
      payment_qr_image: b.qrImage !== undefined ? String(b.qrImage || '') : current.qrImage,
      payment_upi_id: b.upiId !== undefined ? String(b.upiId || '').trim() : current.upiId,
      payment_payee_name: b.payeeName !== undefined ? String(b.payeeName || '').trim() : current.payeeName
    };

    if (next.payment_qr_enabled === 'true' && !next.payment_qr_image) {
      return res.status(400).json({ message: 'Upload a QR code image before enabling QR payment' });
    }
    if (next.payment_qr_image && !next.payment_qr_image.startsWith('/uploads/payment-qr/')) {
      return res.status(400).json({ message: 'Invalid QR image' });
    }

    const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(next)) {
      const prev = await Settings.get(key);
      if ((prev != null ? String(prev) : null) !== value) {
        await SettingAuditLog.create({
          admin_id: req.user.id, setting_key: key,
          previous_value: prev != null ? String(prev) : null, new_value: value, ip_address: ip
        }, connection);
      }
    }
    await Settings.setMultiple(next, connection);
    await connection.commit();

    res.json({ message: 'Payment settings updated', settings: await Settings.getPaymentSettings() });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Update payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Upload the static QR image. Returns the path; it takes effect on save.
exports.adminUploadPaymentQr = (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  res.json({ image_url: `/uploads/payment-qr/${path.basename(req.file.filename)}` });
};
