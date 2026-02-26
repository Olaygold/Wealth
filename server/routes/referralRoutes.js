// routes/referralRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getReferralDashboard,
  withdrawReferralBalance,
  getReferralLink,
  getReferralEarnings,
  getReferredUsers
} = require('../controllers/referralController');

// All routes require authentication
router.use(protect);

// @route   GET /api/referrals/dashboard
// @desc    Get full referral dashboard with stats
// @access  Private
router.get('/dashboard', getReferralDashboard);

// @route   GET /api/referrals/link
// @desc    Get referral link and code only
// @access  Private
router.get('/link', getReferralLink);

// @route   POST /api/referrals/withdraw
// @desc    Withdraw referral balance to main wallet
// @access  Private
router.post('/withdraw', withdrawReferralBalance);

// @route   GET /api/referrals/earnings
// @desc    Get paginated referral earnings history
// @access  Private
router.get('/earnings', getReferralEarnings);

// @route   GET /api/referrals/users
// @desc    Get paginated list of referred users
// @access  Private
router.get('/users', getReferredUsers);

module.exports = router;
