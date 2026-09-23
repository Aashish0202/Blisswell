const { withdrawalService, WithdrawalError } = require('../services/withdrawalService');
const WithdrawalRequest = require('../models/WithdrawalRequest');

// User-facing withdrawal endpoints (verifyToken applied at the router).
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await withdrawalService.requestWithdrawal(req.user.id, amount);
    res.json({ success: true, message: 'Withdrawal request submitted', withdrawal: result });
  } catch (error) {
    const status = error instanceof WithdrawalError ? error.statusCode : 500;
    if (status === 500) console.error('Request withdrawal error:', error);
    res.status(status).json({
      message: error.message,
      code: error.code || 'WITHDRAWAL_ERROR'
    });
  }
};

// Public config for the withdrawal form (min amount, window, split preview).
// Registered before /:id in the router.
exports.getConfig = async (req, res) => {
  try {
    res.json({ config: await withdrawalService.getConfig() });
  } catch (error) {
    console.error('Get withdrawal config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyWithdrawals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await withdrawalService.getMyWithdrawals(req.user.id, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get my withdrawals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getWithdrawalById = async (req, res) => {
  try {
    const wr = await WithdrawalRequest.getById(req.params.id);
    if (!wr) return res.status(404).json({ message: 'Withdrawal not found' });
    // Owner or admin only
    if (wr.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ withdrawal: wr });
  } catch (error) {
    console.error('Get withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin-facing endpoints (isAdmin applied at the router).
exports.getAllWithdrawals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    const result = await withdrawalService.getAllWithdrawals(page, limit, filters);
    res.json(result);
  } catch (error) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.processWithdrawal = async (req, res) => {
  try {
    const wr = await withdrawalService.processWithdrawal(req.user.id, req.params.id);
    res.json({ success: true, message: 'Withdrawal processed', withdrawal: wr });
  } catch (error) {
    const status = error instanceof WithdrawalError ? error.statusCode : 500;
    if (status === 500) console.error('Process withdrawal error:', error);
    res.status(status).json({ message: error.message, code: error.code });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;
    const wr = await withdrawalService.rejectWithdrawal(req.user.id, req.params.id, reason);
    res.json({ success: true, message: 'Withdrawal rejected', withdrawal: wr });
  } catch (error) {
    const status = error instanceof WithdrawalError ? error.statusCode : 500;
    if (status === 500) console.error('Reject withdrawal error:', error);
    res.status(status).json({ message: error.message, code: error.code });
  }
};

exports.reverseWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;
    const wr = await withdrawalService.reverseWithdrawal(req.user.id, req.params.id, reason);
    res.json({ success: true, message: 'Withdrawal reversed', withdrawal: wr });
  } catch (error) {
    const status = error instanceof WithdrawalError ? error.statusCode : 500;
    if (status === 500) console.error('Reverse withdrawal error:', error);
    res.status(status).json({ message: error.message, code: error.code });
  }
};