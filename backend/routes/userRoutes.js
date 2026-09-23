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
router.get('/referrals/summary', userController.getReferralSummary);
router.get('/referrals/:id/purchases', userController.getReferralPurchases);
router.get('/team/downline', userController.getDownlineTeam);

// Earnings + Team Income (new income model)
router.get('/earnings', userController.getEarningsSummary);
router.get('/earnings/breakdown', userController.getEarningsBreakdown);
router.get('/team-income', userController.getTeamIncome);
router.get('/team-income/history', userController.getTeamIncomeHistory);

// Wallet
router.get('/wallet/transactions', userController.getWalletTransactions);

module.exports = router;