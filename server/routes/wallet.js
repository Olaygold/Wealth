
// routes/wallet.js
const express = require('express');
const router = express.Router();
const {
  getBalance,
  getBanksList,
  verifyBankAccount,
  getSavedAccounts,
  setDefaultAccount,
  deleteBankAccount,
  initiateNairaDeposit,
  handleAspfiyWebhook,
  handlePluzzPayWebhook,
  checkDepositStatus,
  getPendingDeposit,
  cancelPendingDeposit,
  requestWithdrawal,
  getTransactions,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  bulkApproveWithdrawals,
  getAmountMismatches,
  approveAmountMismatch
} = require('../controllers/walletController');
const { protect, admin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

// Webhooks
router.post('/webhook/aspfiy', handleAspfiyWebhook);
router.post('/webhook/pluzzpay', handlePluzzPayWebhook);

// =====================================================
// PROTECTED USER ROUTES (Require authentication)
// =====================================================
router.use(protect);

// ==================== WALLET BALANCE ====================
router.get('/balance', getBalance);

// ==================== BANK ACCOUNTS ====================
router.get('/banks', getBanksList);
router.post('/verify-account', apiLimiter, verifyBankAccount);
router.get('/accounts', getSavedAccounts);
router.put('/accounts/:id/default', setDefaultAccount);
router.delete('/accounts/:id', deleteBankAccount);

// ==================== DEPOSITS ====================
router.post('/deposit/naira', apiLimiter, initiateNairaDeposit);
router.get('/deposit/status/:reference', checkDepositStatus);
router.get('/deposit/pending', getPendingDeposit);
router.post('/deposit/cancel/:reference', cancelPendingDeposit);

// ==================== WITHDRAWALS ====================
router.post('/withdraw', apiLimiter, requestWithdrawal);

// ==================== TRANSACTIONS ====================
router.get('/transactions', getTransactions);

// =====================================================
// ADMIN ROUTES (Require admin privileges)
// =====================================================
router.use(admin);

// ==================== ADMIN - WITHDRAWALS ====================
router.get('/admin/pending-withdrawals', getPendingWithdrawals);
router.post('/admin/approve-withdrawal/:reference', approveWithdrawal);
router.post('/admin/reject-withdrawal/:reference', rejectWithdrawal);
router.post('/admin/bulk-approve', bulkApproveWithdrawals);

// ==================== ADMIN - DEPOSIT MISMATCHES ====================
router.get('/admin/mismatches', getAmountMismatches);
router.post('/admin/approve-mismatch/:reference', approveAmountMismatch);

module.exports = router;
