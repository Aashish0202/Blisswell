const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Milestone Rewards (Bike Fund 3x3 / Car Fund 5x5)
router.get('/rewards', rewardController.getMyRewards);

module.exports = router;
