const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');

// All routes are protected
router.use(verifyToken);

// Dashboard
router.get('/dashboard', userController.getDashboard);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/upload-image', uploadProfileImage.single('profile_image'), userController.uploadProfileImage);

// KYC
router.get('/kyc', userController.getKYC);
router.post('/kyc', userController.submitKYC);

// Referrals
router.get('/referrals', userController.getReferrals);

// Salary
router.get('/salary-cycles', userController.getSalaryCycles);
router.get('/payouts', userController.getPayouts);

// Wallet
router.get('/wallet/transactions', userController.getWalletTransactions);

module.exports = router;