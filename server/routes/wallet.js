const express = require('express');
const router = express.Router();
const {
  getBalance,
  initiateNairaDeposit,
  verifyNairaDeposit,
  requestWithdrawal,
  getTransactions
} = require('../controllers/walletController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// All routes are protected
router.use(protect);

router.get('/balance', getBalance);
router.post('/deposit/naira', apiLimiter, initiateNairaDeposit);
router.get('/deposit/verify/:reference', verifyNairaDeposit);
router.post('/withdraw', apiLimiter, requestWithdrawal);
router.get('/transactions', getTransactions);

module.exports = router;
