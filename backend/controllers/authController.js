const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { generateReferralCode } = require('../utils/helpers');
const emailService = require('../utils/emailService');
const pool = require('../config/db');

// Register new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobile, state, password, pan_number, ref, terms_accepted } = req.body;

    // Check if terms are accepted
    if (!terms_accepted) {
      return res.status(400).json({ message: 'You must accept the terms and conditions to register' });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if mobile already exists
    const existingMobile = await User.findByMobile(mobile);
    if (existingMobile) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }

    // Check if PAN already exists - ONE PAN = ONE REGISTRATION
    const existingPAN = await User.findByPAN(pan_number.toUpperCase());
    if (existingPAN) {
      return res.status(400).json({ message: 'PAN number already registered. Each PAN can only be used for one account.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate referral code (format: BSW000000)
    const referral_code = await generateReferralCode(pool);

    // Check referral code - now mandatory
    if (!ref) {
      return res.status(400).json({ message: 'Referral code is required for registration' });
    }

    const referrer = await User.findByReferralCode(ref.trim().toUpperCase());
    if (!referrer) {
      return res.status(400).json({ message: 'Invalid referral code. Please enter a valid referral code.' });
    }
    const referred_by = referrer.id;

    // Create user with PAN
    const userId = await User.create({
      state,
      name,
      email,
      mobile,
      password: hashedPassword,
      pan_number: pan_number.toUpperCase(),
      referral_code,
      referred_by
    });

    // Create wallet for user
    await Wallet.create(userId);

    // Send welcome email (don't await to not block registration)
    emailService.sendWelcomeEmail({
      name,
      email,
      referral_code
    }).catch(err => console.error('Welcome email error:', err));

    res.status(201).json({
      message: 'Registration successful. Please login.',
      user: {
        id: userId,
        name,
        email,
        mobile,
        referral_code,
        password: req.body.password // Return password for display in popup (only on registration)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login with referral code (user ID)
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, password } = req.body;

    // Find user by referral code (case-insensitive, trimmed)
    const user = await User.findByReferralCode(user_id.trim().toUpperCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid User ID or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is blocked. Contact support.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid User ID or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        referral_code: user.referral_code,
        role: user.role,
        pan_status: user.pan_status,
        has_active_package: user.has_active_package
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate referral code
exports.validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Referral code is required' });
    }

    const user = await User.findByReferralCode(code.trim().toUpperCase());
    if (!user) {
      return res.json({ valid: false, message: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrer: {
        name: user.name,
        referral_code: user.referral_code
      }
    });
  } catch (error) {
    console.error('Validate referral error:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};

// Validate PAN number - Check if PAN is already registered
exports.validatePAN = async (req, res) => {
  try {
    const { pan } = req.params;

    if (!pan) {
      return res.status(400).json({ valid: false, message: 'PAN number is required' });
    }

    const panNumber = pan.trim().toUpperCase();

    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(panNumber)) {
      return res.json({ valid: false, message: 'Invalid PAN format. Format should be ABCDE1234F' });
    }

    // Check if PAN already exists
    const existingUser = await User.findByPAN(panNumber);
    if (existingUser) {
      return res.json({ valid: false, message: 'This PAN is already registered. Each PAN can only be used for one account.' });
    }

    res.json({ valid: true, message: 'PAN is available' });
  } catch (error) {
    console.error('Validate PAN error:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await User.updatePassword(user.id, hashedPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};