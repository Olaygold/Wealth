// server/routes/referral.js
const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { protect } = require('../middleware/auth'); // Your auth middleware

// All routes require authentication
router.use(protect);

// GET /api/referrals/dashboard - Get full dashboard data
router.get('/dashboard', referralController.getDashboard);

// POST /api/referrals/withdraw - Withdraw to wallet
router.post('/withdraw', referralController.withdrawToWallet);

// GET /api/referrals/earnings - Get earnings history
router.get('/earnings', referralController.getEarnings);

// GET /api/referrals/users - Get referred users
router.get('/users', referralController.getReferredUsers);

// GET /api/referrals/stats - Get stats summary
router.get('/stats', referralController.getStats);

module.exports = router;
