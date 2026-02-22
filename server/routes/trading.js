
const express = require('express');
const router = express.Router();
const {
  getAllRounds,
  getCurrentPrice,
  getCurrentRound,
  getUpcomingRound,
  placeBet,
  getMyActiveBets,
  getMyBetHistory,
  getRoundHistory,
  getRoundDetails,
  getPlatformStats,
  getLeaderboard
} = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');
const { bettingLimiter, apiLimiter } = require('../middleware/rateLimiter');

// ==================== PUBLIC ROUTES ====================

// Get all rounds (previous, current, upcoming) - FOR DASHBOARD
router.get('/rounds/all', getAllRounds);

// Get current BTC price
router.get('/current-price', getCurrentPrice);

// Get current active round
router.get('/current-round', getCurrentRound);

// Get upcoming round
router.get('/upcoming-round', getUpcomingRound);

// Get round history (completed rounds)
router.get('/rounds/history', getRoundHistory);

// Get specific round details
router.get('/rounds/:roundId', getRoundDetails);

// Get platform statistics
router.get('/stats', getPlatformStats);

// Get leaderboard
router.get('/leaderboard', getLeaderboard);

// ==================== PROTECTED ROUTES ====================

// Place a bet (requires login)
router.post('/bet', protect, bettingLimiter, placeBet);

// Get user's active bets (requires login)
router.get('/my-bets/active', protect, getMyActiveBets);

// Get user's bet history (requires login)
router.get('/my-bets/history', protect, apiLimiter, getMyBetHistory);

module.exports = router;
