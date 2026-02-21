const express = require('express');
const router = express.Router();
const {
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

// Public routes
router.get('/current-round', getCurrentRound);
router.get('/upcoming-round', getUpcomingRound);
router.get('/rounds/history', getRoundHistory);
router.get('/rounds/:roundId', getRoundDetails);
router.get('/stats', getPlatformStats);
router.get('/leaderboard', getLeaderboard);

// Protected routes
router.post('/bet', protect, bettingLimiter, placeBet);
router.get('/my-bets/active', protect, getMyActiveBets);
router.get('/my-bets/history', protect, apiLimiter, getMyBetHistory);

module.exports = router;
