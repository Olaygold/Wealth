const { User, Wallet, Transaction, Round, Bet } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { roundToTwo } = require('../utils/helpers');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.count();
    const activeUsers = await User.count({
      where: { isActive: true }
    });

    // Total transactions
    const totalTransactions = await Transaction.count();
    const pendingWithdrawals = await Transaction.count({
      where: {
        type: 'withdrawal',
        status: 'pending'
      }
    });

    // Financial stats
    const financialStats = await Transaction.findAll({
      attributes: [
        [sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN type = 'deposit' AND status = 'completed' THEN amount ELSE 0 END")
        ), 'totalDeposits'],
        [sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END")
        ), 'totalWithdrawals'],
        [sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN type = 'fee' AND status = 'completed' THEN amount ELSE 0 END")
        ), 'totalFees']
      ],
      raw: true
    });

    // Round stats
    const totalRounds = await Round.count();
    const completedRounds = await Round.count({
      where: { status: 'completed' }
    });

    // Platform revenue from completed rounds
    const roundRevenue = await Round.findAll({
      where: { status: 'completed' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalFeeCollected')), 'entryFees'],
        [sequelize.fn('SUM', sequelize.col('platformCut')), 'platformCuts']
      ],
      raw: true
    });

    // Total bets
    const totalBets = await Bet.count();
    const totalBetVolume = await Bet.sum('totalAmount');

    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentStats = {
      newUsers: await User.count({
        where: { createdAt: { [Op.gte]: last24Hours } }
      }),
      newDeposits: await Transaction.count({
        where: {
          type: 'deposit',
          status: 'completed',
          createdAt: { [Op.gte]: last24Hours }
        }
      }),
      newBets: await Bet.count({
        where: { createdAt: { [Op.gte]: last24Hours } }
      })
    };

    // Calculate total platform revenue
    const totalRevenue = 
      parseFloat(financialStats[0].totalFees || 0) +
      parseFloat(roundRevenue[0].entryFees || 0) +
      parseFloat(roundRevenue[0].platformCuts || 0);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          new24h: recentStats.newUsers
        },
        transactions: {
          total: totalTransactions,
          pendingWithdrawals
        },
        financials: {
          totalDeposits: roundToTwo(parseFloat(financialStats[0].totalDeposits) || 0),
          totalWithdrawals: roundToTwo(parseFloat(financialStats[0].totalWithdrawals) || 0),
          totalRevenue: roundToTwo(totalRevenue),
          entryFees: roundToTwo(parseFloat(roundRevenue[0].entryFees) || 0),
          platformCuts: roundToTwo(parseFloat(roundRevenue[0].platformCuts) || 0)
        },
        rounds: {
          total: totalRounds,
          completed: completedRounds
        },
        bets: {
          total: totalBets,
          volume: roundToTwo(totalBetVolume || 0),
          new24h: recentStats.newBets
        },
        recentActivity: recentStats
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      kycStatus,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    const where = {};

    // Search filter
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { fullName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Status filter
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    // KYC filter
    if (kycStatus) where.kycStatus = kycStatus;

    const users = await User.findAndCountAll({
      where,
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['nairaBalance', 'totalDeposited', 'totalWithdrawn', 'totalWon', 'totalLost']
      }],
      order: [[sortBy, order.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          pages: Math.ceil(users.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// @desc    Get user details
// @route   GET /api/admin/users/:userId
// @access  Private/Admin
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Wallet,
          as: 'wallet'
        },
        {
          model: User,
          as: 'referrals',
          attributes: ['id', 'username', 'createdAt']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's bet statistics
    const betStats = await Bet.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBets'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'win' THEN 1 ELSE 0 END")), 'wins'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'loss' THEN 1 ELSE 0 END")), 'losses'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalWagered'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'netProfit']
      ],
      raw: true
    });

    // Recent transactions
    const recentTransactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Recent bets
    const recentBets = await Bet.findAll({
      where: { userId },
      include: [{
        model: Round,
        as: 'round',
        attributes: ['roundNumber', 'startPrice', 'endPrice', 'result']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        statistics: {
          bets: {
            total: parseInt(betStats[0].totalBets) || 0,
            wins: parseInt(betStats[0].wins) || 0,
            losses: parseInt(betStats[0].losses) || 0,
            winRate: betStats[0].totalBets > 0 
              ? roundToTwo((betStats[0].wins / betStats[0].totalBets) * 100) 
              : 0,
            totalWagered: roundToTwo(parseFloat(betStats[0].totalWagered) || 0),
            netProfit: roundToTwo(parseFloat(betStats[0].netProfit) || 0)
          },
          referrals: user.referrals.length
        },
        recentTransactions,
        recentBets
      }
    });

  } catch (error) {
    console.error('Get user details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:userId/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, kycStatus } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (kycStatus && ['pending', 'approved', 'rejected'].includes(kycStatus)) {
      updateData.kycStatus = kycStatus;
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status,
      userId,
      startDate,
      endDate
    } = req.query;

    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const transactions = await Transaction.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          pages: Math.ceil(transactions.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get all transactions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

// @desc    Get pending withdrawals
// @route   GET /api/admin/withdrawals/pending
// @access  Private/Admin
const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Transaction.findAll({
      where: {
        type: 'withdrawal',
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phoneNumber', 'kycStatus']
      }],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        withdrawals,
        total: withdrawals.length
      }
    });

  } catch (error) {
    console.error('Get pending withdrawals error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending withdrawals',
      error: error.message
    });
  }
};

// @desc    Approve/Reject withdrawal
// @route   PUT /api/admin/withdrawals/:transactionId
// @access  Private/Admin
const processWithdrawal = async (req, res) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const { transactionId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({
        success: false,
        message: 'This is not a withdrawal transaction'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal already ${transaction.status}`
      });
    }

    if (action === 'approve') {
      // Mark as completed
      await transaction.update({
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          processingNote: reason || 'Approved by admin'
        }
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: { transaction }
      });

    } else {
      // Reject - refund user
      const wallet = await Wallet.findOne({
        where: { userId: transaction.userId }
      });

      const amount = parseFloat(transaction.amount);

      // Refund to wallet
      await wallet.update({
        nairaBalance: parseFloat(wallet.nairaBalance) + amount,
        totalWithdrawn: parseFloat(wallet.totalWithdrawn) - amount
      }, { transaction: dbTransaction });

      // Update transaction
      await transaction.update({
        status: 'cancelled',
        metadata: {
          ...transaction.metadata,
          rejectedBy: req.user.id,
          rejectedAt: new Date(),
          rejectionReason: reason || 'Rejected by admin'
        }
      }, { transaction: dbTransaction });

      // Create refund transaction
      await Transaction.create({
        userId: transaction.userId,
        type: 'refund',
        method: 'internal',
        amount,
        status: 'completed',
        description: `Withdrawal refund: ${reason || 'Withdrawal rejected'}`,
        metadata: {
          originalTransactionId: transaction.id
        }
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      res.json({
        success: true,
        message: 'Withdrawal rejected and refunded',
        data: { transaction }
      });
    }

  } catch (error) {
    await dbTransaction.rollback();
    console.error('Process withdrawal error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
};

// @desc    Get all rounds
// @route   GET /api/admin/rounds
// @access  Private/Admin
const getAllRounds = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const where = {};
    if (status) where.status = status;

    const rounds = await Round.findAndCountAll({
      where,
      order: [['roundNumber', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        rounds: rounds.rows,
        pagination: {
          total: rounds.count,
          page: parseInt(page),
          pages: Math.ceil(rounds.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get all rounds error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get rounds',
      error: error.message
    });
  }
};

// @desc    Get round details with all bets
// @route   GET /api/admin/rounds/:roundId/details
// @access  Private/Admin
const getRoundDetailsAdmin = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findByPk(roundId, {
      include: [{
        model: Bet,
        as: 'bets',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }]
      }]
    });

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    // Calculate additional statistics
    const stats = {
      totalBets: round.bets.length,
      upBets: round.bets.filter(b => b.prediction === 'up').length,
      downBets: round.bets.filter(b => b.prediction === 'down').length,
      winners: round.bets.filter(b => b.result === 'win').length,
      losers: round.bets.filter(b => b.result === 'loss').length,
      totalPaidOut: round.bets
        .filter(b => b.result === 'win')
        .reduce((sum, bet) => sum + parseFloat(bet.payout), 0)
    };

    res.json({
      success: true,
      data: {
        round,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Get round details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get round details',
      error: error.message
    });
  }
};

// @desc    Manual round cancellation (emergency)
// @route   PUT /api/admin/rounds/:roundId/cancel
// @access  Private/Admin
const cancelRound = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roundId } = req.params;
    const { reason } = req.body;

    const round = await Round.findByPk(roundId);

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    if (round.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed round'
      });
    }

    // Get all bets for this round
    const bets = await Bet.findAll({
      where: { roundId: round.id }
    });

    // Refund all bets
    for (const bet of bets) {
      const wallet = await Wallet.findOne({
        where: { userId: bet.userId }
      });

      await wallet.update({
        nairaBalance: parseFloat(wallet.nairaBalance) + parseFloat(bet.totalAmount),
        lockedBalance: parseFloat(wallet.lockedBalance) - parseFloat(bet.stakeAmount)
      }, { transaction });

      await bet.update({
        result: 'refund',
        payout: parseFloat(bet.totalAmount),
        profit: 0,
        isPaid: true
      }, { transaction });

      // Create refund transaction
      await Transaction.create({
        userId: bet.userId,
        type: 'refund',
        method: 'internal',
        amount: parseFloat(bet.totalAmount),
        status: 'completed',
        description: `Round #${round.roundNumber} cancelled: ${reason || 'Admin action'}`,
        metadata: {
          betId: bet.id,
          roundId: round.id,
          cancelledBy: req.user.id
        }
      }, { transaction });
    }

    // Update round status
    await round.update({
      status: 'cancelled',
      result: 'cancelled'
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: `Round #${round.roundNumber} cancelled and all bets refunded`,
      data: {
        roundNumber: round.roundNumber,
        totalRefunded: bets.length,
        reason
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Cancel round error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel round',
      error: error.message
    });
  }
};

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        platformFeePercentage: process.env.PLATFORM_FEE_PERCENTAGE,
        losersPoolPlatformCut: process.env.LOSERS_POOL_PLATFORM_CUT,
        minBetAmount: process.env.MIN_BET_AMOUNT,
        maxBetAmount: process.env.MAX_BET_AMOUNT,
        roundDurationMinutes: process.env.ROUND_DURATION_MINUTES
      }
    });

  } catch (error) {
    console.error('Get settings error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};

module.exports = {
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
};
