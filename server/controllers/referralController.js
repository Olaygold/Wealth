// controllers/referralController.js
const { User, ReferralEarning, Wallet, Transaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// =====================================================
// GET REFERRAL DASHBOARD (For Users)
// =====================================================
const getReferralDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with referral info
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'referralCode', 'referralType', 
        'influencerPercentage', 'referralBalance', 
        'totalReferralEarnings', 'referralCount'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get list of referred users
    const referredUsers = await User.findAll({
      where: { referredBy: userId },
      attributes: ['id', 'username', 'createdAt', 'hasPlacedFirstBet', 'isActive'],
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['totalDeposited', 'totalLost']
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Get recent earnings
    const recentEarnings = await ReferralEarning.findAll({
      where: { referrerId: userId },
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['username']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Get earnings stats
    const earningsStats = await ReferralEarning.findAll({
      where: { referrerId: userId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'totalEarned'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions']
      ],
      raw: true
    });

    // Get earnings by type
    const earningsByType = await ReferralEarning.findAll({
      where: { referrerId: userId },
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Generate referral link
    const baseUrl = process.env.FRONTEND_URL || 'https://yoursite.com';
    const referralLink = `${baseUrl}/register?ref=${user.referralCode}`;

    // Calculate percentage based on type
    const percentage = user.referralType === 'influencer' 
      ? parseFloat(user.influencerPercentage) 
      : 5;

    res.json({
      success: true,
      data: {
        // User referral info
        referralCode: user.referralCode,
        referralLink,
        referralType: user.referralType,
        percentage,
        
        // Balances
        referralBalance: parseFloat(user.referralBalance || 0),
        totalEarnings: parseFloat(user.totalReferralEarnings || 0),
        referralCount: user.referralCount || 0,
        
        // Stats
        stats: {
          totalEarned: parseFloat(earningsStats[0]?.totalEarned || 0),
          totalTransactions: parseInt(earningsStats[0]?.totalTransactions || 0),
          byType: earningsByType.reduce((acc, item) => {
            acc[item.type] = {
              total: parseFloat(item.total || 0),
              count: parseInt(item.count || 0)
            };
            return acc;
          }, {})
        },
        
        // Referred users list
        referredUsers: referredUsers.map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.createdAt,
          isActive: u.isActive,
          hasPlacedBet: u.hasPlacedFirstBet,
          totalDeposited: u.wallet ? parseFloat(u.wallet.totalDeposited || 0) : 0,
          totalLost: u.wallet ? parseFloat(u.wallet.totalLost || 0) : 0
        })),
        
        // Recent earnings
        recentEarnings: recentEarnings.map(e => ({
          id: e.id,
          username: e.referredUser?.username || 'Unknown',
          type: e.type,
          typeLabel: e.type === 'first_bet' ? 'First Bet Bonus' : 'Loss Commission',
          betAmount: parseFloat(e.betAmount),
          earnedAmount: parseFloat(e.earnedAmount),
          percentage: parseFloat(e.percentage),
          status: e.status,
          createdAt: e.createdAt
        })),

        // Explanation text
        explanation: user.referralType === 'influencer'
          ? `You earn ${percentage}% commission on every loss from users you refer.`
          : `You earn 5% commission on the first bet of each user you refer.`
      }
    });

  } catch (error) {
    console.error('❌ Get referral dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral dashboard',
      error: error.message
    });
  }
};

// =====================================================
// WITHDRAW REFERRAL BALANCE TO MAIN WALLET
// =====================================================
const withdrawReferralBalance = async (req, res) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { amount } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid amount'
      });
    }

    const withdrawAmount = parseFloat(amount);

    // Minimum withdrawal check
    const minWithdraw = 100; // ₦100 minimum
    if (withdrawAmount < minWithdraw) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ₦${minWithdraw}`
      });
    }

    // Get user with lock
    const user = await User.findByPk(userId, {
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    if (!user) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const referralBalance = parseFloat(user.referralBalance || 0);

    // Check sufficient balance
    if (withdrawAmount > referralBalance) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient referral balance. Available: ₦${referralBalance.toLocaleString()}`
      });
    }

    // Get wallet with lock
    const wallet = await Wallet.findOne({
      where: { userId },
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    if (!wallet) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const balanceBefore = parseFloat(wallet.nairaBalance || 0);
    const balanceAfter = balanceBefore + withdrawAmount;
    const newReferralBalance = referralBalance - withdrawAmount;

    // Update wallet balance
    await wallet.update({
      nairaBalance: balanceAfter
    }, { transaction: dbTransaction });

    // Update user referral balance
    await user.update({
      referralBalance: newReferralBalance
    }, { transaction: dbTransaction });

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'referral_withdrawal',
      method: 'internal',
      amount: withdrawAmount,
      currency: 'NGN',
      status: 'completed',
      balanceBefore,
      balanceAfter,
      description: 'Referral earnings transferred to main wallet',
      reference: `REF-WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }, { transaction: dbTransaction });

    await dbTransaction.commit();

    console.log(`✅ User ${user.username} withdrew ₦${withdrawAmount} from referral balance`);

    res.json({
      success: true,
      message: `Successfully transferred ₦${withdrawAmount.toLocaleString()} to your wallet`,
      data: {
        amountTransferred: withdrawAmount,
        previousReferralBalance: referralBalance,
        newReferralBalance,
        previousWalletBalance: balanceBefore,
        newWalletBalance: balanceAfter
      }
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ Withdraw referral balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw referral balance',
      error: error.message
    });
  }
};

// =====================================================
// GET REFERRAL LINK ONLY (Simple endpoint)
// =====================================================
const getReferralLink = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['referralCode', 'referralType', 'influencerPercentage', 'referralCount', 'referralBalance']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://yoursite.com';
    const referralLink = `${baseUrl}/register?ref=${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink,
        referralType: user.referralType,
        percentage: user.referralType === 'influencer' 
          ? parseFloat(user.influencerPercentage) 
          : 5,
        referralCount: user.referralCount || 0,
        referralBalance: parseFloat(user.referralBalance || 0)
      }
    });

  } catch (error) {
    console.error('❌ Get referral link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral link'
    });
  }
};

// =====================================================
// GET REFERRAL EARNINGS HISTORY (Paginated)
// =====================================================
const getReferralEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const where = { referrerId: userId };
    if (type && ['first_bet', 'loss_commission'].includes(type)) {
      where.type = type;
    }

    const earnings = await ReferralEarning.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['username']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        earnings: earnings.rows.map(e => ({
          id: e.id,
          username: e.referredUser?.username || 'Unknown',
          type: e.type,
          typeLabel: e.type === 'first_bet' ? 'First Bet Bonus' : 'Loss Commission',
          betAmount: parseFloat(e.betAmount),
          earnedAmount: parseFloat(e.earnedAmount),
          percentage: parseFloat(e.percentage),
          status: e.status,
          createdAt: e.createdAt
        })),
        pagination: {
          total: earnings.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(earnings.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get referral earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral earnings'
    });
  }
};

// =====================================================
// GET REFERRED USERS LIST (Paginated)
// =====================================================
const getReferredUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const users = await User.findAndCountAll({
      where: { referredBy: userId },
      attributes: ['id', 'username', 'createdAt', 'hasPlacedFirstBet', 'isActive'],
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['totalDeposited', 'totalLost']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Get earnings per user
    const earningsPerUser = await ReferralEarning.findAll({
      where: { 
        referrerId: userId,
        referredUserId: {
          [Op.in]: users.rows.map(u => u.id)
        }
      },
      attributes: [
        'referredUserId',
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'totalEarned']
      ],
      group: ['referredUserId'],
      raw: true
    });

    const earningsMap = earningsPerUser.reduce((acc, item) => {
      acc[item.referredUserId] = parseFloat(item.totalEarned || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        users: users.rows.map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.createdAt,
          isActive: u.isActive,
          hasPlacedBet: u.hasPlacedFirstBet,
          totalDeposited: u.wallet ? parseFloat(u.wallet.totalDeposited || 0) : 0,
          totalLost: u.wallet ? parseFloat(u.wallet.totalLost || 0) : 0,
          earningsFromUser: earningsMap[u.id] || 0
        })),
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(users.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get referred users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referred users'
    });
  }
};

module.exports = {
  getReferralDashboard,
  withdrawReferralBalance,
  getReferralLink,
  getReferralEarnings,
  getReferredUsers
};
