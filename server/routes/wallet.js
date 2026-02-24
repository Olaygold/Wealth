
// routes/wallet.js
const express = require('express');
const router = express.Router();
const {
  getBalance,
  initiateNairaDeposit,
  handleAspfiyWebhook,
  checkDepositStatus,
  getPendingDeposit,
  cancelPendingDeposit,
  requestWithdrawal,
  getTransactions
} = require('../controllers/walletController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================
router.post('/webhook/aspfiy', handleAspfiyWebhook);

// =====================================================
// PROTECTED ROUTES (Require authentication)
// =====================================================
router.use(protect);

// Balance
router.get('/balance', getBalance);

// Deposits
router.post('/deposit/naira', apiLimiter, initiateNairaDeposit);
router.get('/deposit/status/:reference', checkDepositStatus);
router.get('/deposit/pending', getPendingDeposit);
router.post('/deposit/cancel/:reference', cancelPendingDeposit);

// Withdrawals
router.post('/withdraw', apiLimiter, requestWithdrawal);

// Transactions
router.get('/transactions', getTransactions);

module.exports = router;
