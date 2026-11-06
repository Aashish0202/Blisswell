const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const KYC = require('../models/KYC');
const TeamIncomeEvent = require('../models/TeamIncomeEvent');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WalletTransaction = require('../models/WalletTransaction');
const teamIncomeService = require('../services/teamIncomeService');
const fs = require('fs');
const path = require('path');


// Get user dashboard data (§30 earnings + selfCashback + teamIncome blocks)
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wallet = await Wallet.getByUserId(userId) || { balance: 0, earnings_balance: 0 };

    // Income total (level income from downline purchases)
    const teamIncomeTotal = await TeamIncomeEvent.sumByUpline(userId);
    const rewardIncomeTotal = await WalletTransaction.sumRewards(userId);

    const [wdRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN status='processed' THEN amount ELSE 0 END),0) as withdrawn,
         COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending
       FROM withdrawal_requests WHERE user_id = ?`,
      [userId]
    );
    const totalWithdrawn = parseFloat(wdRows[0].withdrawn) || 0;
    const pendingWithdrawal = parseFloat(wdRows[0].pending) || 0;

    const totalEarnings = parseFloat((teamIncomeTotal + rewardIncomeTotal).toFixed(2));
    const availableForWithdrawal = parseFloat(wallet.earnings_balance) || 0;

    const totalReferrals = await User.countReferrals(userId);
    const activeReferrals = await User.countActiveReferrals(userId);
    // Whole team down to the admin-set Max Levels (directs + their downline)
    const { maxLevels } = await Settings.getQualificationSettings();
    const team = await User.countTeam(userId, maxLevels);

    let recentOrders = [];
    try {
      recentOrders = await Order.getByUserId(userId, 1, 5);
    } catch (e) {
      console.error('Orders fetch error:', e);
    }

    // New income blocks
    const teamIncome = await teamIncomeService.getUplineEarningsSummary(userId);
    // Latest QR payment awaiting admin review (drives "activation pending")
    const [qrRows] = await pool.execute(
      `SELECT pr.id, pr.amount, pr.utr, pr.created_at, p.name AS product_name
         FROM payment_requests pr JOIN products p ON p.id = pr.product_id
        WHERE pr.user_id = ? AND pr.status = 'pending'
        ORDER BY pr.id DESC LIMIT 1`,
      [userId]
    );

    res.json({
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        pan_number: user.pan_number,
        pan_status: user.pan_status,
        referral_code: user.referral_code,
        has_active_package: user.has_active_package,
        rank_name: user.rank_name || null,
        current_product_id: user.current_product_id || null,
        created_at: user.created_at
      },
      wallet: {
        balance: wallet?.balance || 0,
        earnings_balance: availableForWithdrawal
      },
      referrals: {
        total: totalReferrals,
        active: activeReferrals,
        team_total: team.total,
        team_active: team.active
      },
      earnings: {
        totalEarnings,
        teamIncomeTotal: parseFloat(teamIncomeTotal.toFixed(2)),
        rewardIncomeTotal,
        availableForWithdrawal,
        totalWithdrawn,
        pendingWithdrawal
      },
      teamIncome,
      pendingQrPayment: qrRows[0] || null,
      recentOrders: (recentOrders || []).map(o => ({
        id: o.id,
        product_name: o.product_name,
        amount: o.amount,
        status: o.status,
        created_at: o.created_at
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get KYC info
    const kyc = await KYC.getByUserId(req.user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        state: user.state || '',
        address: user.address || '',
        pincode: user.pincode || '',
        pan_number: user.pan_number,
        pan_status: user.pan_status,
        gst_number: user.gst_number || '',
        gst_status: user.gst_status || null,
        referral_code: user.referral_code,
        has_active_package: user.has_active_package,
        profile_image: user.profile_image || null,
        created_at: user.created_at
      },
      kyc: kyc ? {
        id: kyc.id,
        bank_name: kyc.bank_name,
        account_number: kyc.account_number,
        ifsc_code: kyc.ifsc_code,
        branch_name: kyc.branch_name,
        nominee_name: kyc.nominee_name,
        nominee_relation: kyc.nominee_relation,
        kyc_status: kyc.kyc_status,
        rejected_reason: kyc.rejected_reason,
        submitted_at: kyc.submitted_at,
        approved_at: kyc.approved_at
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, mobile, pan_number, state, address, pincode, gst_number } = req.body;

    // Get current user to check existing PAN
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};

    // Only include name and mobile if provided
    if (name !== undefined) {
      updateData.name = name;
    }
    if (mobile !== undefined) {
      updateData.mobile = mobile;
    }

    // Update state and address if provided
    if (state !== undefined) {
      updateData.state = state;
    }
    if (address !== undefined) {
      updateData.address = address;
    }
    if (pincode !== undefined) {
      // Validate format when a non-empty pincode is given (Indian 6-digit)
      if (pincode && pincode.trim() !== '' && !/^[1-9]\d{5}$/.test(pincode.trim())) {
        return res.status(400).json({ message: 'Invalid pincode. Enter a valid 6-digit pincode.' });
      }
      updateData.pincode = pincode && pincode.trim() !== '' ? pincode.trim() : null;
    }

    // Update GST number if provided
    if (gst_number !== undefined) {
      // Check if user already has GST number set
      if (currentUser.gst_number && currentUser.gst_number.trim() !== '') {
        // User already has GST - don't update it
        console.log('GST already exists, skipping GST update');
      } else {
        // Validate GST format (optional - can be empty)
        if (gst_number && gst_number.trim() !== '') {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstRegex.test(gst_number.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid GST number format. Example: 27ANJPC4891P1ZB' });
          }
          updateData.gst_number = gst_number.toUpperCase();
          updateData.gst_status = 'approved'; // Auto-approve GST
        } else {
          updateData.gst_number = null;
        }
      }
    }

    // PAN handling - only process if provided and not empty
    if (pan_number !== undefined && pan_number !== '') {
      // Check if user already has a PAN
      if (currentUser.pan_number && currentUser.pan_number.trim() !== '') {
        // User already has PAN - don't update it, but still update other fields
        console.log('PAN already exists, skipping PAN update but updating other fields');
      } else {
        // Validate PAN format
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan_number.toUpperCase())) {
          return res.status(400).json({ message: 'Invalid PAN format. Example: ABCDE1234F' });
        }

        // Check if PAN is already used by another user
        const existingPAN = await User.findByPAN(pan_number);
        if (existingPAN && existingPAN.id !== req.user.id) {
          return res.status(400).json({ message: 'PAN number already registered by another user' });
        }

        updateData.pan_number = pan_number.toUpperCase();
        updateData.pan_status = 'pending'; // Set status to pending for verification
      }
    }

    await User.update(req.user.id, updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get KYC
exports.getKYC = async (req, res) => {
  try {
    const kyc = await KYC.getByUserId(req.user.id);

    if (!kyc) {
      return res.json({ kyc: null });
    }

    res.json({
      kyc: {
        id: kyc.id,
        bank_name: kyc.bank_name,
        account_number: kyc.account_number,
        ifsc_code: kyc.ifsc_code,
        branch_name: kyc.branch_name,
        nominee_name: kyc.nominee_name,
        nominee_relation: kyc.nominee_relation,
        kyc_status: kyc.kyc_status,
        rejected_reason: kyc.rejected_reason,
        submitted_at: kyc.submitted_at,
        approved_at: kyc.approved_at
      }
    });
  } catch (error) {
    console.error('Get KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit/Update KYC
exports.submitKYC = async (req, res) => {
  try {
    const { bank_name, account_number, ifsc_code, branch_name, nominee_name, nominee_relation } = req.body;

    // Validate required fields
    if (!bank_name || !account_number || !ifsc_code) {
      return res.status(400).json({ message: 'Bank name, account number, and IFSC code are required' });
    }

    // Validate IFSC format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc_code.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid IFSC code format' });
    }

    const kycData = {
      bank_name,
      account_number,
      ifsc_code: ifsc_code.toUpperCase(),
      branch_name,
      nominee_name,
      nominee_relation
    };

    await KYC.upsert(req.user.id, kycData);

    res.json({ message: 'KYC submitted successfully. It will be verified by admin.' });
  } catch (error) {
    console.error('Submit KYC error:', error);
    if (error.message === 'KYC already approved. Contact admin for changes.') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get referrals
exports.getReferrals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const total = await User.countReferrals(req.user.id);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const referrals = await User.getReferralsWithBonus(req.user.id, page, limit);

    res.json({
      referrals: referrals.map(r => ({
        id: r.id,
        name: r.name,
        // email/mobile deliberately omitted — team members' contact details are private
        has_active_package: r.has_active_package,
        direct_business: parseFloat(r.total_purchase || 0),
        bonus_received: parseFloat(r.bonus_received || 0),
        created_at: r.created_at
      })),
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Full 8-level downline tree, with level filter + search across
// name/referral_code (not email/mobile — those are private). Used by the Team page's "My Network" view.
exports.getDownlineTeam = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const level = req.query.level ? parseInt(req.query.level, 10) : null;
    const search = (req.query.search || '').trim();

    // Users only see their team down to the admin-set Max Levels.
    const { maxLevels } = await Settings.getQualificationSettings();
    const { rows, total, levelCounts } = await User.getDownline(req.user.id, { page, limit, level, search, maxLevels });

    res.json({
      maxLevels: Math.min(10, Math.max(1, maxLevels)),
      members: rows.map(r => ({
        id: r.id,
        name: r.name,
        // email/mobile deliberately omitted — team members' contact details are private
        referral_code: r.referral_code,
        sponsor_code: r.sponsor_code,
        sponsor_name: r.sponsor_name,
        has_active_package: r.has_active_package,
        rank_name: r.rank_name,
        level: r.level,
        created_at: r.created_at
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      levelCounts: levelCounts.map(l => ({
        level: l.level,
        count: parseInt(l.count, 10) || 0,
        active_count: parseInt(l.active_count, 10) || 0
      }))
    });
  } catch (error) {
    console.error('Get downline team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Aggregated referral stats (correct across ALL referrals, not just current page)
exports.getReferralSummary = async (req, res) => {
  try {
    const { maxLevels } = await Settings.getQualificationSettings();
    const summary = await User.getReferralSummary(req.user.id, maxLevels);
    res.json({ summary });
  } catch (error) {
    console.error('Get referral summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get purchases (product name, price, purchase date) for a specific referral.
// Only allowed if the target user is actually a referral of the logged-in user.
exports.getReferralPurchases = async (req, res) => {
  try {
    const referralId = parseInt(req.params.id, 10);
    if (!referralId) {
      return res.status(400).json({ message: 'Invalid referral id' });
    }

    // Ownership check: the requested user must have been referred by the caller
    const [rows] = await pool.execute(
      'SELECT id, name, referred_by FROM users WHERE id = ?',
      [referralId]
    );
    const referral = rows[0];
    if (!referral || referral.referred_by !== req.user.id) {
      return res.status(403).json({ message: 'Not your referral' });
    }

    const purchases = await Order.getPurchasesByUserId(referralId);

    res.json({
      referral_name: referral.name,
      purchases: purchases.map(p => ({
        product_name: p.product_name || '—',
        price: parseFloat(p.price || 0),
        purchase_date: p.purchase_date,
        status: p.status
      }))
    });
  } catch (error) {
    console.error('Get referral purchases error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Earnings summary — Total Earnings (level income), available for withdrawal,
// total withdrawn, pending withdrawal.
exports.getEarningsSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await Wallet.getByUserId(userId) || { earnings_balance: 0 };

    const teamIncomeTotal = await TeamIncomeEvent.sumByUpline(userId);
    const rewardIncomeTotal = await WalletTransaction.sumRewards(userId);

    const [wdRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN status='processed' THEN amount ELSE 0 END),0) as withdrawn,
         COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending
       FROM withdrawal_requests WHERE user_id = ?`,
      [userId]
    );
    const totalWithdrawn = parseFloat(wdRows[0].withdrawn) || 0;
    const pendingWithdrawal = parseFloat(wdRows[0].pending) || 0;
    const availableForWithdrawal = parseFloat(wallet.earnings_balance) || 0;

    res.json({
      earnings: {
        totalEarnings: parseFloat((teamIncomeTotal + rewardIncomeTotal).toFixed(2)),
        teamIncomeTotal: parseFloat(teamIncomeTotal.toFixed(2)),
        rewardIncomeTotal,
        availableForWithdrawal,
        totalWithdrawn,
        pendingWithdrawal
      }
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Full earnings breakdown — earnings summary + team income summary.
exports.getEarningsBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await Wallet.getByUserId(userId) || { earnings_balance: 0 };

    const teamIncomeTotal = await TeamIncomeEvent.sumByUpline(userId);
    const rewardIncomeTotal = await WalletTransaction.sumRewards(userId);

    const [wdRows] = await pool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN status='processed' THEN amount ELSE 0 END),0) as withdrawn,
         COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending
       FROM withdrawal_requests WHERE user_id = ?`,
      [userId]
    );
    const totalWithdrawn = parseFloat(wdRows[0].withdrawn) || 0;
    const pendingWithdrawal = parseFloat(wdRows[0].pending) || 0;
    const availableForWithdrawal = parseFloat(wallet.earnings_balance) || 0;

    const teamIncome = await teamIncomeService.getUplineEarningsSummary(userId);

    res.json({
      earnings: {
        totalEarnings: parseFloat((teamIncomeTotal + rewardIncomeTotal).toFixed(2)),
        teamIncomeTotal: parseFloat(teamIncomeTotal.toFixed(2)),
        rewardIncomeTotal,
        availableForWithdrawal,
        totalWithdrawn,
        pendingWithdrawal
      },
      teamIncome
    });
  } catch (error) {
    console.error('Get earnings breakdown error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Team Income summary for the logged-in user (per-rank, per-level earned).
exports.getTeamIncome = async (req, res) => {
  try {
    const teamIncome = await teamIncomeService.getUplineEarningsSummary(req.user.id);
    res.json({ teamIncome });
  } catch (error) {
    console.error('Get team income error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Team Income event history (paginated) for the logged-in user.
// Optional ?source=purchase|repurchase filter.
exports.getTeamIncomeHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const source = req.query.source === 'purchase' || req.query.source === 'repurchase'
      ? req.query.source : '';
    const result = await teamIncomeService.getUplineEvents(req.user.id, page, limit, pool, source);
    res.json(result);
  } catch (error) {
    console.error('Get team income history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const total = await WalletTransaction.countByUserId(req.user.id);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const transactions = await WalletTransaction.getByUserId(req.user.id, page, limit);

    res.json({
      transactions,
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  console.log('[UPLOAD] Request received - User:', req.user?.id);
  console.log('[UPLOAD] Request file:', req.file);
  console.log('[UPLOAD] Request body:', req.body);
  try {
    if (!req.file) {
      console.log('[UPLOAD] ERROR: No file in request');
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const userId = req.user.id;

    // Get current user to check for existing image
    const currentUser = await User.findById(userId);

    // Delete old profile image if exists
    if (currentUser && currentUser.profile_image) {
      const oldImagePath = path.join(__dirname, '..', currentUser.profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image path
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    await User.update(userId, { profile_image: imageUrl });

    res.json({
      message: 'Profile image uploaded successfully',
      profile_image: imageUrl
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};