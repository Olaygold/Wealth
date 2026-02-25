
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
  getSettings
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
/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', getDashboardStats);

// =====================================================
// USER MANAGEMENT
// =====================================================
/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private/Admin
 * @query   ?page=1&limit=20&search=username&status=active&kycStatus=approved
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user details
 * @access  Private/Admin
 */
router.get('/users/:userId', getUserDetails);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Update user status (activate/deactivate, KYC status)
 * @access  Private/Admin
 * @body    { isActive: boolean, kycStatus: string, reason: string }
 */
router.put('/users/:userId/status', updateUserStatus);

// =====================================================
// TRANSACTIONS
// =====================================================
/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filters
 * @access  Private/Admin
 * @query   ?page=1&limit=20&type=deposit&status=completed&userId=xxx
 */
router.get('/transactions', getAllTransactions);

// =====================================================
// WITHDRAWALS
// =====================================================
/**
 * @route   GET /api/admin/withdrawals/pending
 * @desc    Get all pending withdrawal requests
 * @access  Private/Admin
 */
router.get('/withdrawals/pending', getPendingWithdrawals);

/**
 * @route   PUT /api/admin/withdrawals/:transactionId
 * @desc    Process withdrawal (approve/reject)
 * @access  Private/Admin
 * @body    { action: 'approve' | 'reject', reason: string }
 */
router.put('/withdrawals/:transactionId', processWithdrawal);

// =====================================================
// DEPOSITS
// =====================================================
/**
 * @route   GET /api/admin/deposits/mismatches
 * @desc    Get deposits with amount mismatches requiring manual review
 * @access  Private/Admin
 */
router.get('/deposits/mismatches', getAmountMismatches);

/**
 * @route   POST /api/admin/deposits/approve-mismatch/:reference
 * @desc    Manually approve deposit with amount mismatch
 * @access  Private/Admin
 * @body    { creditAmount: number }
 */
router.post('/deposits/approve-mismatch/:reference', approveAmountMismatch);

// =====================================================
// ROUNDS
// =====================================================
/**
 * @route   GET /api/admin/rounds
 * @desc    Get all rounds with filters
 * @access  Private/Admin
 * @query   ?page=1&limit=20&status=completed
 */
router.get('/rounds', getAllRounds);

/**
 * @route   GET /api/admin/rounds/:roundId/details
 * @desc    Get detailed round information with all bets
 * @access  Private/Admin
 */
router.get('/rounds/:roundId/details', getRoundDetailsAdmin);

/**
 * @route   PUT /api/admin/rounds/:roundId/cancel
 * @desc    Cancel a round (emergency - refunds all bets)
 * @access  Private/Admin
 * @body    { reason: string }
 */
router.put('/rounds/:roundId/cancel', cancelRound);

// =====================================================
// SETTINGS
// =====================================================
/**
 * @route   GET /api/admin/settings
 * @desc    Get platform settings
 * @access  Private/Admin
 */
router.get('/settings', getSettings);

// =====================================================
// OPTIONAL: Additional useful routes
// =====================================================

// If you want to add these later, uncomment:

// /**
//  * @route   POST /api/admin/users/:userId/credit
//  * @desc    Manually credit user wallet
//  * @access  Private/Admin
//  * @body    { amount: number, reason: string }
//  */
// router.post('/users/:userId/credit', creditUserWallet);

// /**
//  * @route   POST /api/admin/users/:userId/debit
//  * @desc    Manually debit user wallet
//  * @access  Private/Admin
//  * @body    { amount: number, reason: string }
//  */
// router.post('/users/:userId/debit', debitUserWallet);

// /**
//  * @route   PUT /api/admin/settings
//  * @desc    Update platform settings
//  * @access  Private/Admin
//  * @body    { fees: {...}, betting: {...}, payments: {...} }
//  */
// router.put('/settings', updateSettings);

// /**
//  * @route   GET /api/admin/system/health
//  * @desc    Get system health status
//  * @access  Private/Admin
//  */
// router.get('/system/health', getSystemHealth);

// /**
//  * @route   POST /api/admin/system/clear-cache
//  * @desc    Clear system cache
//  * @access  Private/Admin
//  */
// router.post('/system/clear-cache', clearCache);

// =====================================================
// EXPORT
// =====================================================
module.exports = router;
