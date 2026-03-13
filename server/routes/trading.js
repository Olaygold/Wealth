
const express = require('express');
const router = express.Router();
const {
  getAllRounds,
  getCurrentPrice,
  getCurrentRound,
  getActiveRound,
  getLockedRound,
  getUpcomingRound,
  getPreviousRounds,
  getRoundChart,
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

// ✅ NEW: Get all rounds (previous[], locked, active, upcoming) - FOR DASHBOARD
router.get('/rounds/all', getAllRounds);

// ✅ Get current BTC price
router.get('/current-price', getCurrentPrice);

// ✅ NEW: Get active round (for betting)
router.get('/active-round', getActiveRound);

// ✅ NEW: Get locked round (waiting for result with chart)
router.get('/locked-round', getLockedRound);

// ✅ Get upcoming round
router.get('/upcoming-round', getUpcomingRound);

// ✅ NEW: Get previous completed rounds (last 3)
router.get('/previous-rounds', getPreviousRounds);

// ✅ NEW: Get round chart data (for locked round)
router.get('/rounds/:roundId/chart', getRoundChart);

// Legacy: Get current round (backward compatibility)
router.get('/current-round', getCurrentRound);

// Get round history (completed rounds with pagination)
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
