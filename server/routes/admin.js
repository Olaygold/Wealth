const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllTransactions,
  getPendingWithdrawals,
  processWithdrawal,
  getAllRounds,
  getRoundDetailsAdmin,
  cancelRound,
  getSettings
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/status', updateUserStatus);

// Transactions
router.get('/transactions', getAllTransactions);

// Withdrawals
router.get('/withdrawals/pending', getPendingWithdrawals);
router.put('/withdrawals/:transactionId', processWithdrawal);

// Rounds
router.get('/rounds', getAllRounds);
router.get('/rounds/:roundId/details', getRoundDetailsAdmin);
router.put('/rounds/:roundId/cancel', cancelRound);

// Settings
router.get('/settings', getSettings);

module.exports = router;
