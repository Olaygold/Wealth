
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
  getTransactions,
  getUnmatchedDeposits
} = require('../controllers/walletController');
const { protect, isAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

// Aspfiy Webhook - MUST be public for Aspfiy to call it
// Security is handled via x-wiaxy-signature verification
router.post('/webhook/aspfiy', handleAspfiyWebhook);

// =====================================================
// PROTECTED ROUTES (Require authentication)
// =====================================================
router.use(protect);

// ----- Balance -----
router.get('/balance', getBalance);

// ----- Deposits -----
// Initiate a new deposit (get virtual account details)
router.post('/deposit/naira', apiLimiter, initiateNairaDeposit);

// Check status of a specific deposit
router.get('/deposit/status/:reference', checkDepositStatus);

// Get current pending deposit (if any)
router.get('/deposit/pending', getPendingDeposit);

// Cancel a pending deposit
router.post('/deposit/cancel/:reference', cancelPendingDeposit);

// ----- Withdrawals -----
router.post('/withdraw', apiLimiter, requestWithdrawal);

// ----- Transactions -----
router.get('/transactions', getTransactions);

// =====================================================
// ADMIN ROUTES (Require admin role)
// =====================================================

// Get unmatched deposits for manual review
router.get('/admin/unmatched', isAdmin, getUnmatchedDeposits);

module.exports = router;
