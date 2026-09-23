const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All withdrawal routes require authentication.
router.use(verifyToken);

// User endpoints
router.post('/', withdrawalController.requestWithdrawal);
router.get('/', withdrawalController.getMyWithdrawals);
router.get('/config', withdrawalController.getConfig); // before /:id

// Admin endpoints (must be declared before the /:id owner route)
router.get('/admin/all', isAdmin, withdrawalController.getAllWithdrawals);
router.put('/admin/:id/process', isAdmin, withdrawalController.processWithdrawal);
router.put('/admin/:id/reject', isAdmin, withdrawalController.rejectWithdrawal);
router.put('/admin/:id/reverse', isAdmin, withdrawalController.reverseWithdrawal);

// Owner-or-admin single withdrawal detail (declared last so /admin/* wins)
router.get('/:id', withdrawalController.getWithdrawalById);

module.exports = router;