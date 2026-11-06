const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const OfferBanner = require('../models/OfferBanner');
const { verifyToken } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');

// All routes are protected
router.use(verifyToken);

// Dashboard
router.get('/dashboard', userController.getDashboard);

// Offer banners currently within their scheduled display window
router.get('/offer-banners', async (req, res) => {
  try {
    const banners = await OfferBanner.getCurrent();
    res.json({ banners });
  } catch (error) {
    console.error('Get current offer banners error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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