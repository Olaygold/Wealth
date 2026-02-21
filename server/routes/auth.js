const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getReferrals
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/referrals', protect, getReferrals);

module.exports = router;
