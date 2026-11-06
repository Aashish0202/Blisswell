const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const WalletTransaction = require('../models/WalletTransaction');
const Settings = require('../models/Settings');
const emailService = require('../utils/emailService');
const pool = require('../config/db');
const { PAID_ORDER_STATUSES } = require('../models/orderStatus');

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
             u.rank_name, p.rank_order, COALESCE(w.repurchase_balance, 0) AS repurchase_balance,
             k.kyc_status, s.referral_code AS sponsor_code, s.name AS sponsor_name
      FROM users u
      LEFT JOIN user_kyc k ON u.id = k.user_id
      LEFT JOIN users s ON s.id = u.referred_by
      LEFT JOIN products p ON p.id = u.current_product_id
      LEFT JOIN wallets w ON w.user_id = u.id
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
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
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
      users: rows.map(r => ({ ...r, repurchase_balance: parseFloat(r.repurchase_balance) || 0 })),
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
        gst_number: user.gst_number,
        gst_status: user.gst_status,
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

// Update user GST number (admin only)
exports.updateUserGST = async (req, res) => {
  try {
    const { gst_number } = req.body;
    const userId = req.params.id;

    // Validate GST format if provided
    if (gst_number && gst_number.trim() !== '') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gst_number.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid GST number format. Example: 27ANJPC4891P1ZB' });
      }
      await User.update(userId, { gst_number: gst_number.toUpperCase(), gst_status: 'approved' });
    } else {
      // Clear GST number
      await User.update(userId, { gst_number: null, gst_status: null });
    }

    res.json({ message: 'GST number updated successfully' });
  } catch (error) {
    console.error('Update GST error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user details (admin only)
exports.updateUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, mobile, pan_number, gst_number, state, address } = req.body;

    const updateData = {};

    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (mobile !== undefined) updateData.mobile = mobile;

    // Validate and update PAN if provided
    if (pan_number !== undefined && pan_number !== '') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(pan_number.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid PAN format. Example: ABCDE1234F' });
      }
      // Check if PAN is already used by another user
      const existingPAN = await User.findByPAN(pan_number);
      if (existingPAN && existingPAN.id !== parseInt(userId)) {
        return res.status(400).json({ message: 'PAN number already registered by another user' });
      }
      updateData.pan_number = pan_number.toUpperCase();
      updateData.pan_status = 'approved'; // Admin-updated PAN is auto-approved
    } else if (pan_number === '') {
      updateData.pan_number = null;
      updateData.pan_status = null;
    }

    // Validate and update GST if provided
    if (gst_number !== undefined && gst_number !== '') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gst_number.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid GST number format. Example: 27ANJPC4891P1ZB' });
      }
      updateData.gst_number = gst_number.toUpperCase();
      updateData.gst_status = 'approved'; // Admin-updated GST is auto-approved
    } else if (gst_number === '') {
      updateData.gst_number = null;
      updateData.gst_status = null;
    }

    // Update state and address if provided
    if (state !== undefined) updateData.state = state;
    if (address !== undefined) updateData.address = address;

    await User.update(userId, updateData);

    res.json({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Update user details error:', error);
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

    console.log('[Admin] Fetching orders - Page:', page, 'Filters:', filters);

    const orders = await Order.getAll(page, limit, filters);
    const total = await Order.count(filters);

    console.log('[Admin] Orders found:', orders.length, 'Total:', total);

    res.json({
      orders,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// Manually expire orders stuck in 'processing' (payment initiated but never
// completed). Optionally pass ?minutes=N to override the default 30-min window.
exports.expireStuckOrders = async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes, 10);
    const timeoutMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
    const result = await Order.expireStuckProcessingOrders(timeoutMinutes);

    res.json({
      message: result.count > 0
        ? `Marked ${result.count} abandoned order(s) as failed (stuck in 'processing' for > ${timeoutMinutes} min)`
        : `No stuck orders found (none in 'processing' older than ${timeoutMinutes} min)`,
      expired_count: result.count,
      order_ids: result.order_ids,
      timeout_minutes: timeoutMinutes
    });
  } catch (error) {
    console.error('Expire stuck orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const { name, description, price, daily_amount, days, salary_amount, salary_duration, image, images, youtube_link, rank_name, level_income, rank_order, designs, is_purchasable } = req.body;

    const productId = await Product.create({
      name,
      description,
      price,
      daily_amount,
      days,
      salary_amount,
      salary_duration,
      image,
      images, // New field for multiple images
      youtube_link,
      rank_name,
      level_income, // array of 10 level amounts (levels 1..10)
      rank_order,
      designs, // array of {name, description, images: []}
      is_purchasable: !!is_purchasable, // false = display-only "repurchase coming soon"
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
    const { name, description, price, daily_amount, days, salary_amount, salary_duration, image, images, youtube_link, is_active, rank_name, level_income, rank_order, designs, is_purchasable } = req.body;

    await Product.update(req.params.id, {
      name,
      description,
      price,
      daily_amount,
      days,
      salary_amount,
      salary_duration,
      image,
      images, // New field for multiple images
      youtube_link,
      is_active,
      rank_name,
      level_income, // array of 10 level amounts (levels 1..10)
      rank_order,
      is_purchasable: is_purchasable === undefined ? undefined : !!is_purchasable,
      designs // array of {name, description, images: []}; undefined = unchanged, null/[] = clear
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

// ==================== DASHBOARD + REPORTS (new income model) ====================

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ status: true });
    const totalOrders = await Order.count();
    const totalSales = await Order.getTotalSales();

    const [wdStats] = await pool.execute(
      `SELECT
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count,
         COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending_amount,
         COALESCE(SUM(CASE WHEN status='processed' THEN amount ELSE 0 END),0) AS processed_amount
       FROM withdrawal_requests`
    );
    // payment_requests is created at boot (PaymentRequest.ensureSchema); if
    // it is missing (partial deploy) keep the dashboard working with zeros.
    let qrStats = { pending_count: 0, pending_amount: 0 };
    try {
      [[qrStats]] = await pool.execute(
        `SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount),0) AS pending_amount
           FROM payment_requests WHERE status = 'pending'`
      );
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
      console.error('Dashboard: payment_requests table missing — restart the backend with the new code or run migration 008');
    }
    const [[tiStats]] = await pool.execute(
      `SELECT COALESCE(SUM(amount),0) AS total FROM team_income_events`
    );

    // Milestone rewards (Bike / Car Fund): paid = completed 'reward' credits
    // (same source as the user dashboard's Reward Income); awaiting = achieved
    // but held until the member's own package is active.
    const [[rwPaid]] = await pool.execute(
      `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt
         FROM wallet_transactions WHERE type = 'reward' AND status = 'completed'`
    );
    let rwAwaiting = { cnt: 0, amount: 0 };
    try {
      [[rwAwaiting]] = await pool.execute(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(reward_amount),0) AS amount
           FROM user_reward_progress WHERE status = 'ACHIEVED'`
      );
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
    }

    const recentOrders = await Order.getRecent(10);

    res.json({
      users: { total: totalUsers, active: activeUsers },
      orders: { total: totalOrders, total_sales: totalSales },
      withdrawals: {
        pending_count: parseInt(wdStats[0].pending_count) || 0,
        pending_amount: parseFloat(wdStats[0].pending_amount) || 0,
        processed_amount: parseFloat(wdStats[0].processed_amount) || 0
      },
      income: {
        team_income_paid: parseFloat(tiStats.total) || 0,
        reward_income_paid: parseFloat(rwPaid.total) || 0
      },
      rewards: {
        paid_total: parseFloat(rwPaid.total) || 0,
        paid_count: parseInt(rwPaid.cnt, 10) || 0,
        awaiting_count: parseInt(rwAwaiting.cnt, 10) || 0,
        awaiting_amount: parseFloat(rwAwaiting.amount) || 0
      },
      qrPayments: {
        pending_count: parseInt(qrStats.pending_count, 10) || 0,
        pending_amount: parseFloat(qrStats.pending_amount) || 0
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

// Team Income report — distribution events
exports.getTeamIncomeReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT tie.*, pu.name AS purchaser_name, uu.name AS upline_name, uu.referral_code AS upline_code,
              p.rank_name AS product_rank,
              COALESCE(o.order_source, 'user') AS order_source
       FROM team_income_events tie
       JOIN users pu ON tie.purchaser_id = pu.id
       JOIN users uu ON tie.upline_id = uu.id
       LEFT JOIN products p ON tie.product_id = p.id
       LEFT JOIN orders o ON o.id = tie.order_id
       ORDER BY tie.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[totals]] = await pool.execute(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS amount FROM team_income_events`
    );
    const [[srcTotals]] = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN COALESCE(o.order_source,'user')='auto_repurchase' THEN tie.amount ELSE 0 END),0) AS repurchase_total,
         COALESCE(SUM(CASE WHEN COALESCE(o.order_source,'user')<>'auto_repurchase' THEN tie.amount ELSE 0 END),0) AS purchase_total
       FROM team_income_events tie
       LEFT JOIN orders o ON o.id = tie.order_id`
    );
    res.json({
      events: rows,
      page, limit,
      total: totals.total,
      pages: Math.max(1, Math.ceil(totals.total / limit)),
      totals: {
        total_amount: parseFloat(totals.amount) || 0,
        purchase_total: parseFloat(srcTotals.purchase_total) || 0,
        repurchase_total: parseFloat(srcTotals.repurchase_total) || 0
      }
    });
  } catch (error) {
    console.error('Get team income report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reward Income report — milestone reward credits (Bike / Car Fund).
// Source of truth = completed 'reward' wallet_transactions (order_id holds the
// user_reward_progress id), the same rows the dashboards sum.
exports.getRewardIncomeReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const planId = parseInt(req.query.plan_id) || null;

    const where = ["wt.type = 'reward'", "wt.status = 'completed'"];
    const params = [];
    if (planId) { where.push('p.reward_plan_id = ?'); params.push(planId); }
    const whereSql = where.join(' AND ');
    const fromSql = `
       FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       LEFT JOIN user_reward_progress p ON p.id = wt.order_id
       LEFT JOIN reward_plans rp ON rp.id = p.reward_plan_id
      WHERE ${whereSql}`;

    const [rows] = await pool.execute(
      `SELECT wt.id, wt.user_id, wt.amount, wt.created_at, wt.description, wt.reference_key,
              u.name, u.referral_code, u.mobile, u.email,
              rp.id AS plan_id, rp.name AS plan_name, rp.matrix_label, p.achieved_at
       ${fromSql}
       ORDER BY wt.created_at DESC, wt.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[totals]] = await pool.execute(
      `SELECT COUNT(*) AS total, COALESCE(SUM(wt.amount),0) AS amount ${fromSql}`,
      params
    );
    // Per-plan totals (unfiltered) for the summary cards
    const [byPlan] = await pool.execute(
      `SELECT rp.id AS plan_id, rp.name AS plan_name, rp.matrix_label,
              COUNT(wt.id) AS count, COALESCE(SUM(wt.amount),0) AS amount
         FROM reward_plans rp
         LEFT JOIN user_reward_progress p ON p.reward_plan_id = rp.id
         LEFT JOIN wallet_transactions wt
                ON wt.order_id = p.id AND wt.user_id = p.user_id
               AND wt.type = 'reward' AND wt.status = 'completed'
        GROUP BY rp.id ORDER BY rp.sequence_order, rp.id`
    );
    const [[awaiting]] = await pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(reward_amount),0) AS amount
         FROM user_reward_progress WHERE status = 'ACHIEVED'`
    );

    res.json({
      rewards: rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount) || 0,
        plan_label: r.plan_name ? `${r.plan_name}${r.matrix_label ? ` (${r.matrix_label})` : ''}` : (r.description || 'Reward')
      })),
      page, limit,
      total: Number(totals.total) || 0,
      pages: Math.max(1, Math.ceil((Number(totals.total) || 0) / limit)),
      totals: {
        total_amount: parseFloat(totals.amount) || 0,
        awaiting_count: Number(awaiting.count) || 0,
        awaiting_amount: parseFloat(awaiting.amount) || 0
      },
      by_plan: byPlan.map(b => ({ ...b, count: Number(b.count) || 0, amount: parseFloat(b.amount) || 0 }))
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ rewards: [], page: 1, limit: 20, total: 0, pages: 1, totals: { total_amount: 0, awaiting_count: 0, awaiting_amount: 0 }, by_plan: [] });
    }
    console.error('Get reward income report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Withdrawal report — all withdrawal requests
exports.getWithdrawalReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};
    if (req.query.status) filters.status = req.query.status;

    const { withdrawalService } = require('../services/withdrawalService');
    const result = await withdrawalService.getAllWithdrawals(page, limit, filters);

    const [byStatusRows] = await pool.execute(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount,
              COALESCE(SUM(CASE WHEN status = 'processed' THEN admin_charge ELSE 0 END),0) AS admin_charge,
              COALESCE(SUM(CASE WHEN status = 'processed' THEN repurchase_amount ELSE 0 END),0) AS repurchase_amount,
              COALESCE(SUM(CASE WHEN status = 'processed' THEN payout_amount ELSE 0 END),0) AS payout_amount
       FROM withdrawal_requests GROUP BY status`
    );
    res.json({ ...result, by_status: byStatusRows });
  } catch (error) {
    console.error('Get withdrawal report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User earnings report — per-user income breakdown
exports.getUserEarningsReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT
         u.id, u.name, u.email, u.mobile, u.referral_code, u.has_active_package, u.rank_name,
         COALESCE(ti.total, 0) AS team_income_total,
         COALESCE(w.earnings_balance, 0) AS available_for_withdrawal,
         COALESCE(w.repurchase_balance, 0) AS repurchase_balance,
         COALESCE(wd.withdrawn, 0) AS total_withdrawn,
         COALESCE(wd.pending, 0) AS pending_withdrawal,
         COALESCE(rw.total, 0) AS reward_income_total,
         COALESCE(ti.total,0) + COALESCE(rw.total,0) AS total_earnings
       FROM users u
       LEFT JOIN (SELECT upline_id, SUM(amount) AS total FROM team_income_events GROUP BY upline_id) ti ON ti.upline_id = u.id
       LEFT JOIN (SELECT user_id, SUM(amount) AS total FROM wallet_transactions
                   WHERE type = 'reward' AND status = 'completed' GROUP BY user_id) rw ON rw.user_id = u.id
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN (SELECT user_id,
                   SUM(CASE WHEN status='processed' THEN amount ELSE 0 END) AS withdrawn,
                   SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS pending
                  FROM withdrawal_requests GROUP BY user_id) wd ON wd.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY total_earnings DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[count]] = await pool.execute(`SELECT COUNT(*) AS total FROM users WHERE role='user'`);
    res.json({
      users: rows.map(r => ({
        ...r,
        team_income_total: parseFloat(r.team_income_total) || 0,
        available_for_withdrawal: parseFloat(r.available_for_withdrawal) || 0,
        repurchase_balance: parseFloat(r.repurchase_balance) || 0,
        total_withdrawn: parseFloat(r.total_withdrawn) || 0,
        pending_withdrawal: parseFloat(r.pending_withdrawal) || 0,
        reward_income_total: parseFloat(r.reward_income_total) || 0,
        total_earnings: parseFloat(r.total_earnings) || 0
      })),
      page, limit,
      total: count.total,
      pages: Math.max(1, Math.ceil(count.total / limit))
    });
  } catch (error) {
    console.error('Get user earnings report error:', error);
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

    let dateFilter = '';
    let params = [];
    if (start_date && end_date) {
      dateFilter = 'AND u2.created_at BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    const query = `
      SELECT
        u.id, u.name, u.email, u.mobile, u.referral_code, u.has_active_package, u.created_at,
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

    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT u.id) as total FROM users u
       WHERE EXISTS (SELECT 1 FROM users u2 WHERE u2.referred_by = u.id)`
    );

    res.json({
      users: rows.map(row => ({
        ...row,
        total_referrals: parseInt(row.total_referrals) || 0,
        active_referrals: parseInt(row.active_referrals) || 0
      })),
      page, limit,
      total: countRows[0].total,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (error) {
    console.error('Get referral report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rank report — distribution across ranks + auto-repurchase (rank upgrade) history
exports.getRankReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [distribution] = await pool.execute(
      `SELECT p.id AS product_id, p.rank_name, p.rank_order, p.price,
              COUNT(u.id) AS user_count
       FROM products p
       LEFT JOIN users u ON u.current_product_id = p.id AND u.role = 'user'
       WHERE p.rank_name IS NOT NULL
       GROUP BY p.id, p.rank_name, p.rank_order, p.price
       ORDER BY p.rank_order ASC`
    );
    const [[noRank]] = await pool.execute(
      `SELECT COUNT(*) AS user_count FROM users
       WHERE role = 'user' AND (current_product_id IS NULL OR rank_name IS NULL)`
    );

    const [upgrades] = await pool.execute(
      `SELECT o.id, o.created_at, o.amount, o.source_withdrawal_id,
              u.id AS user_id, u.name AS user_name, u.referral_code AS user_code,
              p.rank_name, p.name AS product_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN products p ON p.id = o.product_id
       WHERE o.order_source = 'auto_repurchase'
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[upgradeTotals]] = await pool.execute(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS amount
       FROM orders WHERE order_source = 'auto_repurchase'`
    );

    res.json({
      distribution: distribution.map(r => ({
        ...r,
        price: parseFloat(r.price) || 0,
        user_count: parseInt(r.user_count) || 0
      })),
      no_rank_count: parseInt(noRank.user_count) || 0,
      upgrades,
      page, limit,
      total: upgradeTotals.total,
      pages: Math.max(1, Math.ceil(upgradeTotals.total / limit)),
      totals: {
        count: parseInt(upgradeTotals.total) || 0,
        amount: parseFloat(upgradeTotals.amount) || 0
      }
    });
  } catch (error) {
    console.error('Get rank report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== SETTINGS (income settings + audit) ====================

// Get income settings
exports.getSettings = async (req, res) => {
  try {
    const income = await Settings.getIncomeSettings();
    res.json({ settings: income });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update income settings. Each changed key is written to the audit log.
exports.updateSettings = async (req, res) => {
  const SettingAuditLog = require('../models/SettingAuditLog');
  const connection = await pool.getConnection();
  try {
    const body = req.body || {};
    const adminId = req.user.id;
    const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

    // Allowed income-setting keys (flat, as sent by the frontend).
    // Level income is configured per product (admin Products page).
    const allowed = [
      'qualification_levels_per_direct', 'qualification_max_levels',
      'withdrawal_min_amount', 'withdrawal_start_time', 'withdrawal_end_time', 'withdrawal_timezone',
      'withdrawal_admin_charge_percent'
    ];

    const toUpdate = {};
    for (const k of allowed) {
      if (body[k] !== undefined) toUpdate[k] = body[k];
    }

    await connection.beginTransaction();

    // Audit each changed key.
    for (const [key, newVal] of Object.entries(toUpdate)) {
      const prev = await Settings.get(key);
      const prevStr = prev != null ? String(prev) : null;
      const newStr = newVal != null ? String(newVal) : null;
      if (prevStr !== newStr) {
        await SettingAuditLog.create({
          admin_id: adminId, setting_key: key,
          previous_value: prevStr, new_value: newStr, ip_address: ip
        }, connection);
      }
    }

    await Settings.updateIncomeSettings(toUpdate, connection);

    await connection.commit();
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

// Settings audit log (§13)
exports.getSettingsAuditLogs = async (req, res) => {
  try {
    const SettingAuditLog = require('../models/SettingAuditLog');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const logs = await SettingAuditLog.getAll(page, limit);
    const total = await SettingAuditLog.countAll();
    res.json({
      logs, page, limit, total,
      pages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    console.error('Get settings audit logs error:', error);
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
        COALESCE(earnings.reward_income, 0) as reward_income,
        COALESCE(pending.pending_amount, 0) as pending_income,
        0 as liability,
        COALESCE(directs.direct_count, 0) as direct_count,
        COALESCE(directs.active_directs, 0) as active_directs
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as total_earned,
               SUM(CASE WHEN type = 'reward' THEN amount ELSE 0 END) as reward_income
        FROM wallet_transactions
        WHERE type IN ('team_income','reward') AND status = 'completed'
        GROUP BY user_id
      ) earnings ON u.id = earnings.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as pending_amount
        FROM withdrawal_requests
        WHERE status = 'pending'
        GROUP BY user_id
      ) pending ON u.id = pending.user_id
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
        COALESCE(SUM(earnings.reward_income), 0) as total_reward_income,
        COALESCE(SUM(pending.pending_amount), 0) as total_pending
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as total_earned,
               SUM(CASE WHEN type = 'reward' THEN amount ELSE 0 END) as reward_income
        FROM wallet_transactions WHERE type IN ('team_income','reward') AND status = 'completed'
        GROUP BY user_id
      ) earnings ON u.id = earnings.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) as pending_amount
        FROM withdrawal_requests WHERE status = 'pending'
        GROUP BY user_id
      ) pending ON u.id = pending.user_id
    `);

    res.json({
      users: rows.map(row => ({
        ...row,
        wallet_balance: parseFloat(row.wallet_balance) || 0,
        total_earned: parseFloat(row.total_earned) || 0,
        reward_income: parseFloat(row.reward_income) || 0,
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
        total_reward_income: parseFloat(grandTotals[0].total_reward_income) || 0,
        total_pending: parseFloat(grandTotals[0].total_pending) || 0
      }
    });
  } catch (error) {
    console.error('Get user financial report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== USER DETAILED REPORT ====================

// Shared WHERE fragment for the user-detail report family (role='user' only,
// optional search + active-only filter).
const buildUserReportWhere = (search, activeOnly) => {
  let where = "u.role = 'user'";
  const params = [];
  if (activeOnly) {
    where += ' AND u.has_active_package = 1';
  }
  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  return { where, params };
};

// Aggregates joined onto users for the per-user financial rollups.
const USER_REPORT_JOIN = `
  LEFT JOIN wallets w ON w.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COALESCE(SUM(amount),0) AS total
    FROM wallet_transactions WHERE type = 'deposit' AND status = 'completed'
    GROUP BY user_id
  ) dep ON dep.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COALESCE(SUM(amount),0) AS total
    FROM wallet_transactions
    WHERE type IN ('team_income','reward','self_cashback','bonus','incentive','refund')
      AND status = 'completed'
    GROUP BY user_id
  ) inc ON inc.user_id = u.id
  LEFT JOIN (
    SELECT user_id,
           COALESCE(SUM(CASE WHEN status IN (${PAID_ORDER_STATUSES}) THEN amount ELSE 0 END),0) AS amount,
           COUNT(CASE WHEN status IN (${PAID_ORDER_STATUSES}) THEN 1 END) AS cnt
    FROM orders GROUP BY user_id
  ) pur ON pur.user_id = u.id
  LEFT JOIN (
    SELECT user_id,
           COALESCE(SUM(CASE WHEN status = 'processed' THEN payout_amount ELSE 0 END),0) AS payout,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END),0) AS pending
    FROM withdrawal_requests GROUP BY user_id
  ) wd ON wd.user_id = u.id
  LEFT JOIN (
    SELECT referred_by,
           COUNT(*) AS direct_count,
           SUM(CASE WHEN has_active_package = 1 THEN 1 ELSE 0 END) AS active_directs
    FROM users GROUP BY referred_by
  ) dl ON dl.referred_by = u.id
`;

// Active-users list for the User Detail report tab: every user with their
// financial rollups, paginated + searchable, optional active-only filter.
exports.getUserReportList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { where, params } = buildUserReportWhere(req.query.search, req.query.active_only === '1');

    const query = `
      SELECT
        u.id, u.name, u.email, u.mobile, u.referral_code,
        u.has_active_package, u.is_active, u.rank_name, u.created_at,
        COALESCE(w.balance, 0) AS wallet_balance,
        COALESCE(w.earnings_balance, 0) AS earnings_balance,
        COALESCE(w.repurchase_balance, 0) AS repurchase_balance,
        COALESCE(dep.total, 0) AS total_deposits,
        COALESCE(inc.total, 0) AS total_income,
        COALESCE(pur.amount, 0) AS total_purchases,
        COALESCE(pur.cnt, 0) AS total_order_count,
        COALESCE(wd.payout, 0) AS total_withdrawn,
        COALESCE(wd.pending, 0) AS pending_withdrawal,
        COALESCE(dl.direct_count, 0) AS direct_count,
        COALESCE(dl.active_directs, 0) AS active_directs
      FROM users u
      ${USER_REPORT_JOIN}
      WHERE ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(query, [...params, limit, offset]);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );

    const [[totals]] = await pool.execute(
      `SELECT
         COALESCE(SUM(COALESCE(w.balance,0)),0) AS wallet_balance,
         COALESCE(SUM(COALESCE(dep.total,0)),0) AS deposits,
         COALESCE(SUM(COALESCE(inc.total,0)),0) AS income,
         COALESCE(SUM(COALESCE(pur.amount,0)),0) AS purchases
       FROM users u
       ${USER_REPORT_JOIN}
       WHERE ${where}`,
      params
    );

    res.json({
      users: rows.map(row => ({
        ...row,
        wallet_balance: parseFloat(row.wallet_balance) || 0,
        earnings_balance: parseFloat(row.earnings_balance) || 0,
        repurchase_balance: parseFloat(row.repurchase_balance) || 0,
        total_deposits: parseFloat(row.total_deposits) || 0,
        total_income: parseFloat(row.total_income) || 0,
        total_purchases: parseFloat(row.total_purchases) || 0,
        total_withdrawn: parseFloat(row.total_withdrawn) || 0,
        pending_withdrawal: parseFloat(row.pending_withdrawal) || 0,
        direct_count: parseInt(row.direct_count) || 0,
        active_directs: parseInt(row.active_directs) || 0
      })),
      page,
      limit,
      total: parseInt(total) || 0,
      pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        wallet_balance: parseFloat(totals.wallet_balance) || 0,
        deposits: parseFloat(totals.deposits) || 0,
        income: parseFloat(totals.income) || 0,
        purchases: parseFloat(totals.purchases) || 0
      }
    });
  } catch (error) {
    console.error('Get user report list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Complete single-user report: profile + sponsor, wallet balances, summary
// stats, level-wise downline, and the FULL history of every transaction
// (wallet ledger, orders, team income events, withdrawals) — no pagination,
// so exports get everything in one response.
exports.getUserDetailReport = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ message: 'Invalid user id' });

    // Profile + sponsor + wallet balances + current rank product
    const [profileRows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.mobile, u.state, u.address, u.referral_code,
              u.pan_number, u.pan_status, u.gst_number, u.rank_name,
              u.has_active_package, u.is_active, u.created_at,
              sp.name AS sponsor_name, sp.referral_code AS sponsor_code,
              w.balance, w.earnings_balance, w.repurchase_balance,
              p.name AS product_name, p.price AS product_price
       FROM users u
       LEFT JOIN users sp ON sp.id = u.referred_by
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN products p ON p.id = u.current_product_id
       WHERE u.id = ?`,
      [userId]
    );
    const profile = profileRows[0];
    if (!profile) return res.status(404).json({ message: 'User not found' });

    // Summary stats (same rollups as the list view, for this one user)
    const [[summary]] = await pool.execute(
      `SELECT
         (SELECT COALESCE(SUM(amount),0) FROM wallet_transactions
          WHERE user_id = ? AND type = 'deposit' AND status = 'completed') AS total_deposits,
         (SELECT COALESCE(SUM(amount),0) FROM wallet_transactions
          WHERE user_id = ?
            AND type IN ('team_income','reward','self_cashback','bonus','incentive','refund')
            AND status = 'completed') AS total_income,
         (SELECT COALESCE(SUM(amount),0) FROM wallet_transactions
          WHERE user_id = ? AND type = 'team_income' AND status = 'completed') AS team_income_total,
         (SELECT COALESCE(SUM(amount),0) FROM wallet_transactions
          WHERE user_id = ? AND type = 'reward' AND status = 'completed') AS reward_income_total,
         (SELECT COALESCE(SUM(amount),0) FROM wallet_transactions
          WHERE user_id = ? AND type = 'self_cashback' AND status = 'completed') AS cashback_total,
         (SELECT COALESCE(SUM(CASE WHEN status IN (${PAID_ORDER_STATUSES}) THEN amount ELSE 0 END),0)
          FROM orders WHERE user_id = ?) AS total_purchases,
         (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status IN (${PAID_ORDER_STATUSES})) AS order_count,
         (SELECT COALESCE(SUM(CASE WHEN status = 'processed' THEN payout_amount ELSE 0 END),0)
          FROM withdrawal_requests WHERE user_id = ?) AS total_withdrawn,
         (SELECT COALESCE(SUM(amount),0) FROM withdrawal_requests
          WHERE user_id = ? AND status = 'pending') AS pending_withdrawal,
         (SELECT COUNT(*) FROM users WHERE referred_by = ?) AS direct_count,
         (SELECT COUNT(*) FROM users
          WHERE referred_by = ? AND has_active_package = 1) AS active_directs`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    // Complete wallet ledger — every transaction, newest first
    const [transactions] = await pool.execute(
      `SELECT wt.*, su.name AS source_user_name, su.referral_code AS source_user_code,
              o.order_number
       FROM wallet_transactions wt
       LEFT JOIN users su ON su.id = wt.source_user_id
       LEFT JOIN orders o ON o.id = wt.order_id
       WHERE wt.user_id = ?
       ORDER BY wt.created_at DESC, wt.id DESC`,
      [userId]
    );

    // All orders (purchases + auto repurchases)
    const [orders] = await pool.execute(
      `SELECT o.id, o.order_number, o.amount, o.status, o.payment_type,
              COALESCE(o.order_source, 'user') AS order_source, o.created_at,
              p.name AS product_name, p.rank_name
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );

    // Team income this user RECEIVED (as upline), newest first
    const [incomeEvents] = await pool.execute(
      `SELECT tie.*, pu.name AS purchaser_name, pu.referral_code AS purchaser_code,
              COALESCE(o.order_source, 'user') AS order_source
       FROM team_income_events tie
       JOIN users pu ON pu.id = tie.purchaser_id
       LEFT JOIN orders o ON o.id = tie.order_id
       WHERE tie.upline_id = ?
       ORDER BY tie.created_at DESC, tie.id DESC`,
      [userId]
    );

    // All withdrawal requests
    const [withdrawals] = await pool.execute(
      `SELECT * FROM withdrawal_requests WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    // Level-wise downline (1 = directs), full tree + per-level counts
    const [downline] = await pool.execute(
      `WITH RECURSIVE tree AS (
         SELECT id, name, email, mobile, referral_code, has_active_package,
                rank_name, created_at, 1 AS level
         FROM users WHERE referred_by = ?
         UNION ALL
         SELECT u.id, u.name, u.email, u.mobile, u.referral_code,
                u.has_active_package, u.rank_name, u.created_at, t.level + 1
         FROM users u JOIN tree t ON u.referred_by = t.id
         WHERE t.level < 10
       )
       SELECT * FROM tree ORDER BY level ASC, created_at DESC`,
      [userId]
    );
    const levelCounts = [];
    for (const row of downline) {
      const existing = levelCounts.find(l => l.level === row.level);
      if (existing) {
        existing.total += 1;
        if (row.has_active_package) existing.active += 1;
      } else {
        levelCounts.push({
          level: row.level,
          total: 1,
          active: row.has_active_package ? 1 : 0
        });
      }
    }

    res.json({
      profile: {
        ...profile,
        wallet_balance: parseFloat(profile.balance) || 0,
        earnings_balance: parseFloat(profile.earnings_balance) || 0,
        repurchase_balance: parseFloat(profile.repurchase_balance) || 0,
        product_price: parseFloat(profile.product_price) || 0
      },
      summary: {
        total_deposits: parseFloat(summary.total_deposits) || 0,
        total_income: parseFloat(summary.total_income) || 0,
        team_income_total: parseFloat(summary.team_income_total) || 0,
        reward_income_total: parseFloat(summary.reward_income_total) || 0,
        cashback_total: parseFloat(summary.cashback_total) || 0,
        total_purchases: parseFloat(summary.total_purchases) || 0,
        order_count: parseInt(summary.order_count) || 0,
        total_withdrawn: parseFloat(summary.total_withdrawn) || 0,
        pending_withdrawal: parseFloat(summary.pending_withdrawal) || 0,
        direct_count: parseInt(summary.direct_count) || 0,
        active_directs: parseInt(summary.active_directs) || 0
      },
      transactions,
      orders,
      income_events: incomeEvents,
      withdrawals,
      downline,
      level_counts: levelCounts
    });
  } catch (error) {
    console.error('Get user detail report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};