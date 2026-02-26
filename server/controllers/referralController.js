
// server/controllers/referralController.js
const referralService = require('../services/referralService');

/**
 * Get referral dashboard
 * GET /api/referrals/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const dashboardData = await referralService.getDashboardData(userId);
    
    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Get dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load referral dashboard'
    });
  }
};

/**
 * Withdraw referral balance to wallet
 * POST /api/referrals/withdraw
 */
const withdrawToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid amount'
      });
    }

    const result = await referralService.withdrawToWallet(userId, amount);
    
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        amount: result.amount,
        newReferralBalance: result.newReferralBalance,
        newWalletBalance: result.newWalletBalance
      }
    });

  } catch (error) {
    console.error('❌ Withdraw error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Withdrawal failed'
    });
  }
};

/**
 * Get referral earnings history
 * GET /api/referrals/earnings
 */
const getEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const { ReferralEarning, User } = require('../models');
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: earnings } = await ReferralEarning.findAndCountAll({
      where: { referrerId: userId },
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['username']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      data: {
        earnings: earnings.map(e => ({
          id: e.id,
          username: e.referredUser?.username || 'Unknown',
          type: e.type,
          typeLabel: e.type === 'first_bet' ? 'First Bet Bonus' : 'Loss Commission',
          betAmount: parseFloat(e.betAmount) || 0,
          earnedAmount: parseFloat(e.earnedAmount) || 0,
          percentage: e.percentage,
          status: e.status,
          createdAt: e.createdAt
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get earnings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load earnings'
    });
  }
};

/**
 * Get referred users list
 * GET /api/referrals/users
 */
const getReferredUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const { User, Wallet } = require('../models');
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: users } = await User.findAndCountAll({
      where: { referredBy: userId },
      attributes: ['id', 'username', 'createdAt', 'isActive', 'hasPlacedFirstBet'],
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['totalDeposited', 'nairaBalance']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.createdAt,
          isActive: u.isActive,
          hasPlacedBet: u.hasPlacedFirstBet,
          totalDeposited: parseFloat(u.wallet?.totalDeposited) || 0
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get referred users error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load referred users'
    });
  }
};

/**
 * Get referral stats summary
 * GET /api/referrals/stats
 */
const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { User, ReferralEarning } = require('../models');
    const { sequelize } = require('../config/database');
    
    const user = await User.findByPk(userId, {
      attributes: [
        'referralCode', 'referralType', 'influencerPercentage',
        'referralBalance', 'totalReferralEarnings', 'referralCount'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get monthly stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyStats = await ReferralEarning.findAll({
      where: { 
        referrerId: userId,
        status: 'completed',
        createdAt: { [require('sequelize').Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactions'],
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'earned']
      ],
      raw: true
    });

    const isInfluencer = user.referralType === 'influencer';

    return res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        type: user.referralType || 'normal',
        percentage: isInfluencer ? (parseFloat(user.influencerPercentage) || 0) : 5,
        currentBalance: parseFloat(user.referralBalance) || 0,
        totalEarnings: parseFloat(user.totalReferralEarnings) || 0,
        totalReferrals: user.referralCount || 0,
        monthlyStats: {
          transactions: parseInt(monthlyStats[0]?.transactions) || 0,
          earned: parseFloat(monthlyStats[0]?.earned) || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load stats'
    });
  }
};

module.exports = {
  getDashboard,
  withdrawToWallet,
  getEarnings,
  getReferredUsers,
  getStats
};
