
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
// All admin routes require authentication and admin role
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

// ✅ Credit/Debit user wallet
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
// ROUNDS
// =====================================================
router.get('/rounds', getAllRounds);
router.get('/rounds/:roundId/details', getRoundDetailsAdmin);
router.put('/rounds/:roundId/cancel', cancelRound);

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
