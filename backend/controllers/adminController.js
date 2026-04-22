const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const SalaryCycle = require('../models/SalaryCycle');
const SalaryPayout = require('../models/SalaryPayout');
const WalletTransaction = require('../models/WalletTransaction');
const Settings = require('../models/Settings');
const emailService = require('../utils/emailService');
const pool = require('../config/db');

// ==================== USER MANAGEMENT ====================

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      pan_status: req.query.pan_status,
      search: req.query.search
    };

    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.name, u.email, u.mobile, u.pan_number, u.pan_status,
             u.referral_code, u.is_active, u.has_active_package, u.created_at,
             k.kyc_status
      FROM users u
      LEFT JOIN user_kyc k ON u.id = k.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status !== undefined) {
      query += ' AND u.is_active = ?';
      params.push(filters.status);
    }
    if (filters.pan_status) {
      query += ' AND u.pan_status = ?';
      params.push(filters.pan_status);
    }
    if (filters.search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    if (filters.status !== undefined) {
      countQuery += ' AND is_active = ?';
      countParams.push(filters.status);
    }
    if (filters.pan_status) {
      countQuery += ' AND pan_status = ?';
      countParams.push(filters.pan_status);
    }
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    res.json({
      users: rows,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const referrals = await User.getReferrals(user.id);
    const orders = await Order.getByUserId(user.id, 1, 10);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        pan_number: user.pan_number,
        pan_status: user.pan_status,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        has_active_package: user.has_active_package,
        is_active: user.is_active,
        created_at: user.created_at
      },
      referrals,
      orders
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Block/Unblock user
exports.toggleUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await User.toggleStatus(req.params.id, status);

    res.json({ message: `User ${status ? 'activated' : 'blocked'} successfully` });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve PAN
exports.approvePAN = async (req, res) => {
  try {
    await User.approvePAN(req.params.id);

    res.json({ message: 'PAN approved successfully' });
  } catch (error) {
    console.error('Approve PAN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== ORDER MANAGEMENT ====================

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      user_id: req.query.user_id,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const orders = await Order.getAll(page, limit, filters);
    const total = await Order.count(filters);

    res.json({
      orders,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Order.updateStatus(req.params.id, status);

    res.json({ message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== PRODUCT MANAGEMENT ====================

// Get all products (admin)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.getAll();

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, salary_amount, salary_duration, image } = req.body;

    const productId = await Product.create({
      name,
      description,
      price,
      salary_amount: salary_amount || 100,
      salary_duration: salary_duration || 12,
      image,
      is_active: true
    });

    res.status(201).json({
      message: 'Product created successfully',
      product_id: productId
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, salary_amount, salary_duration, image, is_active } = req.body;

    await Product.update(req.params.id, {
      name,
      description,
      price,
      salary_amount,
      salary_duration,
      image,
      is_active
    });

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    await Product.delete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== SALARY MANAGEMENT ====================

// Get salary cycles
exports.getSalaryCycles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      sponsor_id: req.query.sponsor_id
    };

    const cycles = await SalaryCycle.getAll(page, limit, filters);

    res.json({
      cycles,
      page,
      limit
    });
  } catch (error) {
    console.error('Get salary cycles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payouts
exports.getPayouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      user_id: req.query.user_id,
      month: req.query.month,
      year: req.query.year
    };

    const payouts = await SalaryPayout.getAll(page, limit, filters);

    res.json({
      payouts,
      page,
      limit
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payout status
exports.updatePayoutStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const paidAt = status === 'paid' ? new Date() : null;

    await SalaryPayout.updateStatus(req.params.id, status, paidAt);

    // Send payout email if status is 'paid'
    if (status === 'paid') {
      const payout = await SalaryPayout.getById(req.params.id);
      if (payout) {
        const user = await User.findById(payout.user_id);
        if (user) {
          const cycle = await SalaryCycle.getById(payout.cycle_id);
          const cycleName = cycle ? `Cycle ${cycle.id}` : 'Monthly';
          emailService.sendPayoutEmail(user, payout.amount, cycleName)
            .catch(err => console.error('Payout email error:', err));
        }
      }
    }

    res.json({ message: 'Payout status updated' });
  } catch (error) {
    console.error('Update payout status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk update payouts
exports.bulkUpdatePayouts = async (req, res) => {
  try {
    const { payout_ids, status } = req.body;
    const paidAt = status === 'paid' ? new Date() : null;

    for (const id of payout_ids) {
      await SalaryPayout.updateStatus(id, status, paidAt);
    }

    res.json({ message: 'Payouts updated successfully' });
  } catch (error) {
    console.error('Bulk update payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== REPORTS ====================

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ status: true });
    const totalOrders = await Order.count();
    const totalSales = await Order.getTotalSales();

    const pendingPayouts = await SalaryPayout.countByStatus('pending');
    const pendingAmount = await SalaryPayout.getTotalByStatus('pending');
    const paidAmount = await SalaryPayout.getTotalByStatus('paid');

    const activeLiability = await SalaryCycle.getTotalActiveLiability();
    const activeCycles = await SalaryCycle.countByStatus('active');
    const pausedCycles = await SalaryCycle.countByStatus('paused');
    const completedCycles = await SalaryCycle.countByStatus('completed');

    const recentOrders = await Order.getRecent(10);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      orders: {
        total: totalOrders,
        total_sales: totalSales
      },
      salary: {
        pending_payouts: pendingPayouts,
        pending_amount: pendingAmount,
        paid_amount: paidAmount,
        active_liability: activeLiability
      },
      cycles: {
        active: activeCycles,
        paused: pausedCycles,
        completed: completedCycles
      },
      recentOrders
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sales report
exports.getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const totalSales = await Order.getTotalSales(start_date, end_date);
    const orderCount = await Order.count({ start_date, end_date });
    const ordersByStatus = await Order.getCountByStatus();

    res.json({
      total_sales: totalSales,
      order_count: orderCount,
      orders_by_status: ordersByStatus
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Salary report
exports.getSalaryReport = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const monthlySummary = await SalaryPayout.getMonthlySummary(currentYear);
    const liabilityReport = await SalaryCycle.getLiabilityReport();

    res.json({
      monthly_summary: monthlySummary,
      liability_report: liabilityReport,
      year: currentYear
    });
  } catch (error) {
    console.error('Get salary report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Liability report
exports.getLiabilityReport = async (req, res) => {
  try {
    const liabilityReport = await SalaryCycle.getLiabilityReport();
    const totalLiability = await SalaryCycle.getTotalActiveLiability();

    res.json({
      liability_by_status: liabilityReport,
      total_active_liability: totalLiability
    });
  } catch (error) {
    console.error('Get liability report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Referral report - Users with their direct referral counts
exports.getReferralReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { start_date, end_date } = req.query;

    // Build date filter for referrals
    let dateFilter = '';
    let params = [];

    if (start_date && end_date) {
      dateFilter = 'AND u2.created_at BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    // Get users with their referral counts
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.referral_code,
        u.has_active_package,
        u.created_at,
        COUNT(DISTINCT u2.id) as total_referrals,
        SUM(CASE WHEN u2.has_active_package = 1 THEN 1 ELSE 0 END) as active_referrals
      FROM users u
      LEFT JOIN users u2 ON u.id = u2.referred_by ${dateFilter}
      GROUP BY u.id
      HAVING total_referrals > 0
      ORDER BY total_referrals DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const [rows] = await pool.execute(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM users u2 WHERE u2.referred_by = u.id
      )
    `;
    const [countRows] = await pool.execute(countQuery);

    res.json({
      users: rows.map(row => ({
        ...row,
        total_referrals: parseInt(row.total_referrals) || 0,
        active_referrals: parseInt(row.active_referrals) || 0
      })),
      page,
      limit,
      total: countRows[0].total,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (error) {
    console.error('Get referral report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== SETTINGS ====================

// Get settings
exports.getSettings = async (req, res) => {
  try {
    const closingDay = await Settings.get('closing_day');
    const repurchaseEnabled = await Settings.get('repurchase_enabled');

    res.json({
      settings: {
        closing_day: parseInt(closingDay) || 5,
        repurchase_enabled: repurchaseEnabled === 'true'
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const { closing_day, repurchase_enabled } = req.body;

    await Settings.setMultiple({
      closing_day: closing_day?.toString(),
      repurchase_enabled: repurchase_enabled?.toString()
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get site settings (public + admin)
exports.getSiteSettings = async (req, res) => {
  try {
    const settings = await Settings.getSiteSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get site settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update site settings (admin only)
exports.updateSiteSettings = async (req, res) => {
  try {
    const {
      site_name,
      site_tagline,
      site_logo,
      contact_phone,
      contact_email,
      contact_address,
      social_facebook,
      social_instagram,
      social_twitter,
      social_linkedin,
      social_youtube,
      terms_and_conditions
    } = req.body;

    await Settings.updateSiteSettings({
      site_name,
      site_tagline,
      site_logo,
      contact_phone,
      contact_email,
      contact_address,
      social_facebook,
      social_instagram,
      social_twitter,
      social_linkedin,
      social_youtube,
      terms_and_conditions
    });

    res.json({ message: 'Site settings updated successfully' });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload logo image
exports.uploadLogoImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/logos/${req.file.filename}`;
    await Settings.set('site_logo', imageUrl);

    res.json({
      message: 'Logo uploaded successfully',
      logo_url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload product image
exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Return the URL path to the uploaded image
    const imageUrl = `/uploads/products/${req.file.filename}`;

    res.json({
      message: 'Image uploaded successfully',
      image_url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login as user (admin impersonation)
exports.loginAsUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the requester is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can use this feature' });
    }

    // Get the user to impersonate
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a token for the user
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login token generated successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login as user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add wallet balance to user (admin)
exports.addWalletBalance = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const adminId = req.user.id;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify name and email match (security check)
    const { verifyName, verifyEmail } = req.body;
    if (verifyName && verifyName.toLowerCase() !== user.name.toLowerCase()) {
      return res.status(400).json({ message: 'Name does not match' });
    }
    if (verifyEmail && verifyEmail.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ message: 'Email does not match' });
    }

    // Add balance to wallet
    const Wallet = require('../models/Wallet');
    const WalletTransaction = require('../models/WalletTransaction');

    // Update wallet balance
    await Wallet.updateBalance(userId, parseFloat(amount));

    // Create transaction record
    await WalletTransaction.create({
      user_id: userId,
      type: 'deposit',
      amount: parseFloat(amount),
      description: description || `Admin deposit by admin ID: ${adminId}`,
      status: 'completed'
    });

    res.json({
      message: 'Balance added successfully',
      amount: parseFloat(amount),
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Add wallet balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search users for wallet deposit (admin)
exports.searchUsersForDeposit = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.search(query);

    res.json({
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        referral_code: u.referral_code,
        wallet_balance: u.wallet_balance || 0,
        is_active: u.is_active,
        has_active_package: u.has_active_package
      }))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== KYC MANAGEMENT ====================

// Get all KYC submissions
exports.getKYCSubmissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      status: req.query.status,
      search: req.query.search
    };

    const KYC = require('../models/KYC');
    const submissions = await KYC.getAll(page, limit, filters);
    const total = await KYC.count(filters);

    res.json({
      submissions,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get KYC submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve KYC
exports.approveKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const KYC = require('../models/KYC');

    const kyc = await KYC.findById(id);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC submission not found' });
    }

    await KYC.approve(id);

    res.json({ message: 'KYC approved successfully' });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject KYC
exports.rejectKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const KYC = require('../models/KYC');

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const kyc = await KYC.findById(id);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC submission not found' });
    }

    await KYC.reject(id, reason);

    res.json({ message: 'KYC rejected successfully' });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user KYC details
exports.getUserKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const KYC = require('../models/KYC');

    const kyc = await KYC.getByUserId(userId);
    if (!kyc) {
      return res.json({ kyc: null });
    }

    res.json({ kyc });
  } catch (error) {
    console.error('Get user KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update KYC by admin
exports.updateKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation, kyc_status } = req.body;
    const KYC = require('../models/KYC');

    const kyc = await KYC.findById(id);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC submission not found' });
    }

    await KYC.updateByAdmin(id, {
      bank_name,
      account_number,
      ifsc_code,
      branch_name,
      nominee_name,
      nominee_relation,
      kyc_status
    });

    const updatedKyc = await KYC.findById(id);
    res.json({ message: 'KYC updated successfully', kyc: updatedKyc });
  } catch (error) {
    console.error('Update KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== FINANCIAL REPORTS ====================

// Get wallet transaction report (deposits)
exports.getWalletReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { type, status, start_date, end_date, user_id } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (user_id) filters.user_id = user_id;

    const WalletTransaction = require('../models/WalletTransaction');
    const transactions = await WalletTransaction.getAll(page, limit, filters);
    const total = await WalletTransaction.count(filters);

    // Get total amounts by type
    const [depositTotal] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE type = 'deposit' AND status = 'completed'`
    );
    const [purchaseTotal] = await pool.execute(
      `SELECT COALESCE(ABS(SUM(amount)), 0) as total FROM wallet_transactions WHERE type = 'purchase' AND status = 'completed'`
    );

    res.json({
      transactions,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      summary: {
        total_deposits: depositTotal[0].total || 0,
        total_purchases: purchaseTotal[0].total || 0
      }
    });
  } catch (error) {
    console.error('Get wallet report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payouts with KYC details for export
exports.getPayoutsWithKYC = async (req, res) => {
  try {
    const { month, year, status } = req.query;

    let query = `
      SELECT
        sp.id,
        sp.amount,
        sp.status,
        sp.month,
        sp.year,
        sp.created_at,
        u.id as user_id,
        u.name,
        u.email,
        u.mobile,
        u.pan_number,
        u.pan_status,
        u.referral_code,
        k.bank_name,
        k.account_number,
        k.ifsc_code,
        k.branch_name,
        k.nominee_name,
        k.nominee_relation,
        k.kyc_status,
        CASE
          WHEN u.pan_status = 'approved' AND k.kyc_status = 'approved' THEN 'complete'
          ELSE 'incomplete'
        END as verification_status
      FROM salary_payouts sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN user_kyc k ON u.id = k.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND sp.status = ?';
      params.push(status);
    }
    if (month && year) {
      query += ' AND sp.month = ? AND sp.year = ?';
      params.push(month, year);
    }

    query += ' ORDER BY sp.created_at DESC';

    const [rows] = await pool.execute(query, params);

    // Calculate totals
    const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const completeCount = rows.filter(r => r.verification_status === 'complete').length;
    const incompleteCount = rows.filter(r => r.verification_status === 'incomplete').length;

    res.json({
      payouts: rows,
      summary: {
        total_count: rows.length,
        total_amount: totalAmount,
        complete_count: completeCount,
        incomplete_count: incompleteCount
      }
    });
  } catch (error) {
    console.error('Get payouts with KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export payouts to Excel
exports.exportPayoutsExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { month, year, status } = req.query;

    let query = `
      SELECT
        u.name as 'Name',
        u.email as 'Email',
        u.mobile as 'Mobile',
        u.referral_code as 'User ID',
        sp.amount as 'Amount',
        sp.status as 'Payout Status',
        u.pan_number as 'PAN Number',
        u.pan_status as 'PAN Status',
        k.bank_name as 'Bank Name',
        k.account_number as 'Account Number',
        k.ifsc_code as 'IFSC Code',
        k.branch_name as 'Branch Name',
        k.nominee_name as 'Nominee Name',
        k.nominee_relation as 'Nominee Relation',
        k.kyc_status as 'KYC Status',
        CASE
          WHEN u.pan_status = 'approved' AND k.kyc_status = 'approved' THEN 'Complete'
          ELSE 'Incomplete'
        END as 'Verification Status'
      FROM salary_payouts sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN user_kyc k ON u.id = k.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND sp.status = ?';
      params.push(status);
    }
    if (month && year) {
      query += ' AND sp.month = ? AND sp.year = ?';
      params.push(month, year);
    }

    query += ' ORDER BY u.name ASC';

    const [rows] = await pool.execute(query, params);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Mobile
      { wch: 12 }, // User ID
      { wch: 10 }, // Amount
      { wch: 12 }, // Payout Status
      { wch: 15 }, // PAN Number
      { wch: 12 }, // PAN Status
      { wch: 20 }, // Bank Name
      { wch: 18 }, // Account Number
      { wch: 12 }, // IFSC Code
      { wch: 20 }, // Branch Name
      { wch: 20 }, // Nominee Name
      { wch: 15 }, // Nominee Relation
      { wch: 12 }, // KYC Status
      { wch: 15 }, // Verification Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Payouts');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    const filename = `payouts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export payouts Excel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== BUSINESS BONUS ====================

// Get business bonus report
exports.getBusinessBonusReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;

    const BusinessBonus = require('../models/BusinessBonus');
    const bonuses = await BusinessBonus.getAll(page, limit, { search });
    const total = await BusinessBonus.count({ search });
    const summary = await BusinessBonus.getSummary();

    res.json({
      bonuses: bonuses.map(b => ({
        ...b,
        total_direct_business: parseFloat(b.total_direct_business) || 0,
        bonus_earned: parseFloat(b.bonus_earned) || 0,
        pending_bonus: parseFloat(b.pending_bonus) || 0,
        paid_bonus: parseFloat(b.paid_bonus) || 0
      })),
      summary: {
        ...summary,
        total_business: parseFloat(summary.total_business) || 0,
        total_bonus_earned: parseFloat(summary.total_bonus_earned) || 0,
        pending_bonus: parseFloat(summary.pending_bonus) || 0,
        paid_bonus: parseFloat(summary.paid_bonus) || 0
      },
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get business bonus report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get bonus payouts
exports.getBonusPayouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status } = req.query;

    const BusinessBonus = require('../models/BusinessBonus');
    const payouts = await BusinessBonus.getAllPayouts(page, limit, { status });

    // Get totals
    const [totals] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM bonus_payouts
    `);

    res.json({
      payouts: payouts.map(p => ({
        ...p,
        amount: parseFloat(p.amount) || 0,
        milestone_amount: parseFloat(p.milestone_amount) || 0
      })),
      summary: totals[0],
      page,
      limit
    });
  } catch (error) {
    console.error('Get bonus payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update bonus payout status
exports.updateBonusPayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const BusinessBonus = require('../models/BusinessBonus');
    await BusinessBonus.updatePayoutStatus(id, status);

    res.json({ message: 'Bonus payout status updated' });
  } catch (error) {
    console.error('Update bonus payout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Recalculate all business bonuses
exports.recalculateBonuses = async (req, res) => {
  try {
    const BusinessBonus = require('../models/BusinessBonus');
    const count = await BusinessBonus.recalculateAll();

    res.json({
      message: 'Business bonuses recalculated',
      users_processed: count
    });
  } catch (error) {
    console.error('Recalculate bonuses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export bonus payouts to Excel
exports.exportBonusPayoutsExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { status } = req.query;

    let query = `
      SELECT
        u.name as 'Name',
        u.email as 'Email',
        u.mobile as 'Mobile',
        u.referral_code as 'User ID',
        bp.amount as 'Bonus Amount',
        bp.milestone_amount as 'Milestone',
        bp.status as 'Status',
        bp.created_at as 'Created',
        u.pan_status as 'PAN Status',
        k.bank_name as 'Bank Name',
        k.account_number as 'Account Number',
        k.ifsc_code as 'IFSC Code',
        k.branch_name as 'Branch',
        k.kyc_status as 'KYC Status'
      FROM bonus_payouts bp
      JOIN users u ON bp.user_id = u.id
      LEFT JOIN user_kyc k ON u.id = k.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND bp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY bp.created_at DESC';

    const [rows] = await pool.execute(query, params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
      { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 12 },
      { wch: 20 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Bonus Payouts');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `bonus-payouts-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export bonus payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user financial report
exports.getUserFinancialReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;
    const offset = (page - 1) * limit;

    // Build query for user financial summary
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.referral_code,
        u.has_active_package,
        u.is_active,
        u.created_at,
        COALESCE(w.balance, 0) as wallet_balance,
        COALESCE(earnings.total_earned, 0) as total_earned,
        COALESCE(pending.pending_amount, 0) as pending_income,
        COALESCE(liability.remaining_liability, 0) as liability,
        COALESCE(directs.direct_count, 0) as direct_count,
        COALESCE(directs.active_directs, 0) as active_directs
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as total_earned
        FROM salary_payouts
        WHERE status = 'paid'
        GROUP BY user_id
      ) earnings ON u.id = earnings.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as pending_amount
        FROM salary_payouts
        WHERE status = 'pending'
        GROUP BY user_id
      ) pending ON u.id = pending.user_id
      LEFT JOIN (
        SELECT sponsor_id,
          COUNT(*) as cycle_count,
          SUM((duration - months_paid) * monthly_amount) as remaining_liability
        FROM salary_cycles
        WHERE status = 'active'
        GROUP BY sponsor_id
      ) liability ON u.id = liability.sponsor_id
      LEFT JOIN (
        SELECT referred_by,
          COUNT(*) as direct_count,
          SUM(CASE WHEN has_active_package = 1 THEN 1 ELSE 0 END) as active_directs
        FROM users
        GROUP BY referred_by
      ) directs ON u.id = directs.referred_by
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const [rows] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    // Get grand totals
    const [grandTotals] = await pool.execute(`
      SELECT
        COALESCE(SUM(w.balance), 0) as total_wallet_balance,
        COALESCE(SUM(earnings.total_earned), 0) as total_earned,
        COALESCE(SUM(pending.pending_amount), 0) as total_pending,
        COALESCE(SUM(liability.remaining_liability), 0) as total_liability
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as total_earned
        FROM salary_payouts WHERE status = 'paid'
        GROUP BY user_id
      ) earnings ON u.id = earnings.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as pending_amount
        FROM salary_payouts WHERE status = 'pending'
        GROUP BY user_id
      ) pending ON u.id = pending.user_id
      LEFT JOIN (
        SELECT sponsor_id, SUM((duration - months_paid) * monthly_amount) as remaining_liability
        FROM salary_cycles WHERE status = 'active'
        GROUP BY sponsor_id
      ) liability ON u.id = liability.sponsor_id
    `);

    res.json({
      users: rows.map(row => ({
        ...row,
        wallet_balance: parseFloat(row.wallet_balance) || 0,
        total_earned: parseFloat(row.total_earned) || 0,
        pending_income: parseFloat(row.pending_income) || 0,
        liability: parseFloat(row.liability) || 0,
        direct_count: parseInt(row.direct_count) || 0,
        active_directs: parseInt(row.active_directs) || 0
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      grand_totals: {
        total_wallet_balance: parseFloat(grandTotals[0].total_wallet_balance) || 0,
        total_earned: parseFloat(grandTotals[0].total_earned) || 0,
        total_pending: parseFloat(grandTotals[0].total_pending) || 0,
        total_liability: parseFloat(grandTotals[0].total_liability) || 0
      }
    });
  } catch (error) {
    console.error('Get user financial report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};