const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const SalaryCycle = require('../models/SalaryCycle');
const SalaryPayout = require('../models/SalaryPayout');
const KYC = require('../models/KYC');
const fs = require('fs');
const path = require('path');

// Get user dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[DASHBOARD] Request received - User ID from token:', userId);
    console.log('[DASHBOARD] Request headers authorization:', req.headers.authorization?.substring(0, 50) + '...');

    // Get user info
    const user = await User.findById(userId);
    console.log('[DASHBOARD] Fetched user from DB:', user?.id, '-', user?.name, '-', user?.referral_code);

    if (!user) {
      console.log('[DASHBOARD] User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Get wallet balance
    let wallet = { balance: 0 };
    try {
      wallet = await Wallet.getByUserId(userId) || { balance: 0 };
    } catch (e) {
      console.error('Wallet fetch error:', e);
    }

    // Get referral count
    let totalReferrals = 0;
    let activeReferrals = 0;
    try {
      totalReferrals = (await User.getReferrals(userId)).length;
      activeReferrals = await User.countActiveReferrals(userId);
    } catch (e) {
      console.error('Referrals fetch error:', e);
    }

    // Get salary cycles
    let cycles = [];
    try {
      cycles = await SalaryCycle.getBySponsorId(userId, 1, 100);
    } catch (e) {
      console.error('Cycles fetch error:', e);
    }

    // Get pending salary
    let pendingAmount = 0;
    let totalEarned = 0;
    try {
      const pendingPayouts = await SalaryPayout.getAll(1, 100, { user_id: userId, status: 'pending' });
      pendingAmount = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    } catch (e) {
      console.error('Pending payouts fetch error:', e);
    }

    // Get total earned
    try {
      const allPayouts = await SalaryPayout.getAll(1, 1000, { user_id: userId });
      totalEarned = allPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    } catch (e) {
      console.error('All payouts fetch error:', e);
    }

    // Get recent orders
    let recentOrders = [];
    try {
      recentOrders = await Order.getByUserId(userId, 1, 5);
    } catch (e) {
      console.error('Orders fetch error:', e);
    }

    const response = {
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        pan_number: user.pan_number,
        pan_status: user.pan_status,
        referral_code: user.referral_code,
        has_active_package: user.has_active_package,
        created_at: user.created_at
      },
      wallet: {
        balance: wallet?.balance || 0
      },
      referrals: {
        total: totalReferrals,
        active: activeReferrals
      },
      salary: {
        pending_amount: pendingAmount,
        total_earned: totalEarned,
        this_month: 0,
        last_month: 0,
        active_cycles: cycles.filter(c => c.status === 'active').length,
        completed_cycles: cycles.filter(c => c.status === 'completed').length
      },
      recentOrders: (recentOrders || []).map(o => ({
        id: o.id,
        product_name: o.product_name,
        amount: o.amount,
        status: o.status,
        created_at: o.created_at
      }))
    };

    console.log('Dashboard response:', JSON.stringify(response, null, 2));
    res.json(response);
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
        pan_number: user.pan_number,
        pan_status: user.pan_status,
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
    const { name, mobile, pan_number, state, address } = req.body;

    // Get current user to check existing PAN
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = { name, mobile };

    // Update state and address if provided
    if (state !== undefined) {
      updateData.state = state;
    }
    if (address !== undefined) {
      updateData.address = address;
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

    const referrals = await User.getReferralsWithBonus(req.user.id);

    res.json({
      referrals: referrals.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        mobile: r.mobile,
        has_active_package: r.has_active_package,
        direct_business: parseFloat(r.total_purchase || 0),
        bonus_received: parseFloat(r.bonus_received || 0),
        created_at: r.created_at
      })),
      total: referrals.length
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get salary cycles
exports.getSalaryCycles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const cycles = await SalaryCycle.getBySponsorId(req.user.id, page, limit);

    res.json({
      cycles: cycles.map(c => ({
        id: c.id,
        referral_name: c.referral_name,
        referral_email: c.referral_email,
        start_month: c.start_month,
        monthly_amount: c.monthly_amount,
        months_paid: c.months_paid,
        duration: c.duration,
        status: c.status,
        created_at: c.created_at
      })),
      page,
      limit
    });
  } catch (error) {
    console.error('Get salary cycles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payout history
exports.getPayouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const payouts = await SalaryPayout.getByUserId(req.user.id, page, limit);

    res.json({
      payouts: payouts.map(p => ({
        id: p.id,
        referral_name: p.referral_name,
        month: p.month,
        year: p.year,
        amount: p.amount,
        status: p.status,
        paid_at: p.paid_at,
        created_at: p.created_at
      })),
      page,
      limit
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const transactions = await require('../models/WalletTransaction').getByUserId(req.user.id, page, limit);

    res.json({
      transactions,
      page,
      limit
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