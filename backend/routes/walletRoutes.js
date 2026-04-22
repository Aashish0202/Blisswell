const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware/auth');

// Webhook route MUST be before auth middleware (public endpoint for Razorpay)
router.post('/webhook', walletController.webhook);

// All routes below are protected
router.use(verifyToken);

// Wallet operations
router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/deposit/order', walletController.createDepositOrder);
router.post('/deposit/verify', walletController.verifyPayment);

module.exports = router;