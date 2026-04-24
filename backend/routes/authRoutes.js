const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Register validation
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid mobile number is required'),
  body('pan_number').matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/).withMessage('Valid PAN number is required (format: ABCDE1234F)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('terms_accepted').equals('true').withMessage('You must accept the terms and conditions')
];

// Login validation (using user_id/referral_code instead of email)
const loginValidation = [
  body('user_id').trim().notEmpty().withMessage('User ID is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/validate-referral/:code', authController.validateReferralCode);
router.get('/validate-pan/:pan', authController.validatePAN);
router.post('/forgot-password', authController.forgotPassword);
router.get('/validate-reset-token/:token', authController.validateResetToken);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.get('/me', verifyToken, authController.getMe);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;