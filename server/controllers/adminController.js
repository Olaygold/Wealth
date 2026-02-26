
// controllers/adminController.js
const { User, Wallet, Transaction, Round, Bet, PendingDeposit, VirtualAccount } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { roundToTwo } = require('../utils/helpers');

// =====================================================
// DASHBOARD
// =====================================================

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // ===== USER STATISTICS =====
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsers24h = await User.count({
      where: { createdAt: { [Op.gte]: last24Hours } }
    });

    // ===== FINANCIAL STATISTICS =====
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

    // ===== WALLET TOTALS =====
    const walletStats = await Wallet.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('nairaBalance')), 'totalBalance'],
        [sequelize.fn('SUM', sequelize.col('lockedBalance')), 'totalLocked']
      ],
      raw: true
    });

    // ===== ROUND STATISTICS =====
    const totalRounds = await Round.count();
    const completedRounds = await Round.count({ where: { status: 'completed' } });
    
    const roundRevenue = await Round.findAll({
      where: { status: 'completed' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalFeeCollected')), 'entryFees'],
        [sequelize.fn('SUM', sequelize.col('platformCut')), 'platformCuts']
      ],
      raw: true
    });

    // ===== BET STATISTICS =====
    const totalBets = await Bet.count();
    const totalBetVolume = await Bet.sum('totalAmount') || 0;
    const newBets24h = await Bet.count({
      where: { createdAt: { [Op.gte]: last24Hours } }
    });

    // ===== PENDING ACTIONS =====
    const pendingWithdrawals = await Transaction.count({
      where: { type: 'withdrawal', status: 'pending' }
    });

    const amountMismatches = await PendingDeposit.count({
      where: {
        status: 'pending',
        webhookData: {
          [Op.ne]: null
        }
      }
    });

    const flaggedUsers = await User.count({
      where: { isActive: false }
    });

    // ===== CALCULATE TOTAL REVENUE =====
    const totalRevenue = 
      parseFloat(financialStats[0]?.totalFees || 0) +
      parseFloat(roundRevenue[0]?.entryFees || 0) +
      parseFloat(roundRevenue[0]?.platformCuts || 0);

    // ===== RECENT ACTIVITY =====
    const recentDeposits = await Transaction.count({
      where: {
        type: 'deposit',
        status: 'completed',
        createdAt: { [Op.gte]: last24Hours }
      }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          new24h: newUsers24h
        },
        financials: {
          totalDeposits: roundToTwo(parseFloat(financialStats[0]?.totalDeposits) || 0),
          totalWithdrawals: roundToTwo(parseFloat(financialStats[0]?.totalWithdrawals) || 0),
          totalRevenue: roundToTwo(totalRevenue),
          entryFees: roundToTwo(parseFloat(roundRevenue[0]?.entryFees) || 0),
          platformCuts: roundToTwo(parseFloat(roundRevenue[0]?.platformCuts) || 0),
          totalUserBalance: roundToTwo(parseFloat(walletStats[0]?.totalBalance) || 0),
          totalLocked: roundToTwo(parseFloat(walletStats[0]?.totalLocked) || 0)
        },
        rounds: {
          total: totalRounds,
          completed: completedRounds,
          active: totalRounds - completedRounds
        },
        bets: {
          total: totalBets,
          volume: roundToTwo(totalBetVolume),
          new24h: newBets24h
        },
        pending: {
          withdrawals: pendingWithdrawals,
          amountMismatches: amountMismatches,
          flaggedUsers: flaggedUsers
        },
        recentActivity: {
          newUsers: newUsers24h,
          newDeposits: recentDeposits,
          newBets: newBets24h
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

// =====================================================
// USER MANAGEMENT
// =====================================================

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
        attributes: ['nairaBalance', 'lockedBalance', 'totalDeposited', 'totalWithdrawn', 'totalWon', 'totalLost']
      }],
      order: [[sortBy, order.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    res.json({
      success: true,
      data: {
        users: users.rows.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          isActive: u.isActive,
          isVerified: u.isVerified,
          kycStatus: u.kycStatus,
          role: u.role,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
          wallet: u.wallet ? {
            balance: parseFloat(u.wallet.nairaBalance),
            locked: parseFloat(u.wallet.lockedBalance),
            totalDeposited: parseFloat(u.wallet.totalDeposited),
            totalWithdrawn: parseFloat(u.wallet.totalWithdrawn),
            totalWon: parseFloat(u.wallet.totalWon),
            totalLost: parseFloat(u.wallet.totalLost)
          } : null
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
    console.error('❌ Get users error:', error);
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

    // Recent transactions (last 20)
    const recentTransactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Recent bets (last 20)
    const recentBets = await Bet.findAll({
      where: { userId },
      include: [{
        model: Round,
        as: 'round',
        attributes: ['roundNumber', 'startPrice', 'endPrice', 'result']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Pending deposits
    const pendingDeposits = await PendingDeposit.findAll({
      where: { userId, status: 'pending' },
      include: [{
        model: VirtualAccount,
        as: 'virtualAccount'
      }]
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        statistics: {
          bets: {
            total: parseInt(betStats[0]?.totalBets) || 0,
            wins: parseInt(betStats[0]?.wins) || 0,
            losses: parseInt(betStats[0]?.losses) || 0,
            winRate: betStats[0]?.totalBets > 0 
              ? roundToTwo((betStats[0].wins / betStats[0].totalBets) * 100) 
              : 0,
            totalWagered: roundToTwo(parseFloat(betStats[0]?.totalWagered) || 0),
            netProfit: roundToTwo(parseFloat(betStats[0]?.netProfit) || 0)
          },
          referrals: user.referrals.length
        },
        recentTransactions,
        recentBets,
        pendingDeposits
      }
    });

  } catch (error) {
    console.error('❌ Get user details error:', error);
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
    const { isActive, kycStatus, reason } = req.body;

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

    console.log(`✅ Admin ${req.user.id} updated user ${userId}:`, updateData, 'Reason:', reason);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('❌ Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// =====================================================
// TRANSACTION MANAGEMENT
// =====================================================

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
        attributes: ['id', 'username', 'email']
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
          limit: parseInt(limit),
          pages: Math.ceil(transactions.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

// =====================================================
// WITHDRAWAL MANAGEMENT
// =====================================================

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
        attributes: ['id', 'username', 'email', 'phoneNumber', 'kycStatus'],
        include: [{
          model: Wallet,
          as: 'wallet',
          attributes: ['nairaBalance', 'totalDeposited', 'totalWithdrawn']
        }]
      }],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        withdrawals,
        total: withdrawals.length,
        totalAmount: withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0)
      }
    });

  } catch (error) {
    console.error('❌ Get pending withdrawals error:', error);
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
    const { action, reason } = req.body;

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

      console.log(`✅ Withdrawal ${transactionId} approved by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: { transaction }
      });

    } else {
      // Reject - refund user
      const wallet = await Wallet.findOne({
        where: { userId: transaction.userId },
        transaction: dbTransaction
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
        currency: 'NGN',
        status: 'completed',
        description: `Withdrawal refund: ${reason || 'Withdrawal rejected'}`,
        metadata: {
          originalTransactionId: transaction.id,
          refundedBy: req.user.id
        }
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      console.log(`❌ Withdrawal ${transactionId} rejected by admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Withdrawal rejected and refunded',
        data: { transaction }
      });
    }

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
};

// =====================================================
// DEPOSIT AMOUNT MISMATCHES
// =====================================================

// @desc    Get deposits with amount mismatch
// @route   GET /api/admin/deposits/mismatches
// @access  Private/Admin
const getAmountMismatches = async (req, res) => {
  try {
    const mismatches = await PendingDeposit.findAll({
      where: {
        status: 'pending',
        webhookData: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phoneNumber']
        },
        {
          model: VirtualAccount,
          as: 'virtualAccount',
          attributes: ['accountNumber', 'accountName', 'bankName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Filter only those requiring manual review
    const flaggedDeposits = mismatches.filter(deposit => 
      deposit.webhookData?.requiresManualReview === true
    );

    res.json({
      success: true,
      data: {
        count: flaggedDeposits.length,
        deposits: flaggedDeposits.map(d => ({
          id: d.id,
          reference: d.reference,
          user: {
            id: d.user.id,
            username: d.user.username,
            email: d.user.email,
            phone: d.user.phoneNumber
          },
          account: {
            number: d.virtualAccount.accountNumber,
            name: d.virtualAccount.accountName,
            bank: d.virtualAccount.bankName
          },
          expectedAmount: parseFloat(d.amount),
          receivedAmount: d.webhookData?.receivedAmount,
          difference: d.webhookData?.amountDifference,
          payer: d.webhookData?.payer,
          aspfiyRef: d.webhookData?.aspfiyReference,
          createdAt: d.createdAt,
          webhookReceivedAt: d.webhookData?.receivedAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get mismatches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get amount mismatches'
    });
  }
};

// @desc    Manually approve amount mismatch
// @route   POST /api/admin/deposits/approve-mismatch/:reference
// @access  Private/Admin
// @desc    Manually approve amount mismatch
// @route   POST /api/admin/deposits/approve-mismatch/:reference
// @access  Private/Admin
const approveAmountMismatch = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;
    const { creditAmount } = req.body;

    if (!creditAmount || creditAmount <= 0) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid credit amount'
      });
    }

    // ✅ STEP 1: Find deposit WITHOUT lock (to avoid outer join lock error)
    const pendingDeposit = await PendingDeposit.findOne({
      where: { reference },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phoneNumber'],
          include: [
            { 
              model: Wallet, 
              as: 'wallet',
              attributes: ['id', 'userId', 'nairaBalance', 'totalDeposited']
            }
          ]
        }
      ]
      // NO lock here!
    });

    if (!pendingDeposit) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Deposit not found'
      });
    }

    const wallet = pendingDeposit.user?.wallet;
    if (!wallet) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // ✅ STEP 2: Now lock ONLY the wallet (no outer joins = no error)
    const lockedWallet = await Wallet.findOne({
      where: { id: wallet.id },
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    if (!lockedWallet) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Failed to lock wallet'
      });
    }

    // Check if already processed
    if (pendingDeposit.status !== 'pending') {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Deposit already ${pendingDeposit.status}`
      });
    }

    // ✅ STEP 3: Credit the wallet (use lockedWallet, not wallet)
    const balanceBefore = parseFloat(lockedWallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + parseFloat(creditAmount);

    await lockedWallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(lockedWallet.totalDeposited || 0) + parseFloat(creditAmount)
    }, { transaction: dbTransaction });

    // ✅ STEP 4: Update pending deposit
    await pendingDeposit.update({
      status: 'completed',
      completedAt: new Date(),
      webhookData: {
        ...pendingDeposit.webhookData,
        manuallyApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        creditedAmount: parseFloat(creditAmount)
      }
    }, { transaction: dbTransaction });

    // ✅ STEP 5: Update transaction record
    await Transaction.update({
      status: 'completed',
      balanceBefore,
      balanceAfter,
      amount: parseFloat(creditAmount),
      metadata: {
        manuallyApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        originalAmount: parseFloat(pendingDeposit.amount),
        receivedAmount: pendingDeposit.webhookData?.receivedAmount,
        creditedAmount: parseFloat(creditAmount),
        reason: 'Amount mismatch - manually approved by admin'
      }
    }, {
      where: { reference },
      transaction: dbTransaction
    });

    await dbTransaction.commit();

    console.log(`✅ Manual approval success: ${reference} by admin ${req.user.id}`);
    console.log(`   User: ${pendingDeposit.userId} (${pendingDeposit.user?.username})`);
    console.log(`   Amount: ₦${creditAmount}`);
    console.log(`   New balance: ₦${balanceAfter}`);

    // ✅ STEP 6: Send real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${pendingDeposit.userId}`).emit('deposit_confirmed', {
        amount: parseFloat(creditAmount),
        newBalance: balanceAfter,
        reference: pendingDeposit.reference,
        timestamp: new Date(),
        message: `Your deposit of ₦${parseFloat(creditAmount).toLocaleString()} has been approved by admin! 🎉`
      });
    }

    res.json({
      success: true,
      message: 'Deposit manually approved and credited successfully',
      data: {
        reference: pendingDeposit.reference,
        creditedAmount: parseFloat(creditAmount),
        newBalance: balanceAfter,
        userId: pendingDeposit.userId,
        username: pendingDeposit.user?.username
      }
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ Approve mismatch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve deposit',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// =====================================================
// ROUND MANAGEMENT
// =====================================================

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
          limit: parseInt(limit),
          pages: Math.ceil(rounds.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get rounds error:', error);
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

    // Calculate statistics
    const stats = {
      totalBets: round.bets.length,
      upBets: round.bets.filter(b => b.prediction === 'up').length,
      downBets: round.bets.filter(b => b.prediction === 'down').length,
      winners: round.bets.filter(b => b.result === 'win').length,
      losers: round.bets.filter(b => b.result === 'loss').length,
      totalPaidOut: round.bets
        .filter(b => b.result === 'win')
        .reduce((sum, bet) => sum + parseFloat(bet.payout), 0),
      totalWagered: round.bets
        .reduce((sum, bet) => sum + parseFloat(bet.totalAmount), 0)
    };

    res.json({
      success: true,
      data: {
        round,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('❌ Get round details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get round details',
      error: error.message
    });
  }
};

// @desc    Cancel round (emergency)
// @route   PUT /api/admin/rounds/:roundId/cancel
// @access  Private/Admin
const cancelRound = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roundId } = req.params;
    const { reason } = req.body;

    const round = await Round.findByPk(roundId, { transaction });

    if (!round) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    if (round.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed round'
      });
    }

    // Get all bets
    const bets = await Bet.findAll({
      where: { roundId: round.id },
      transaction
    });

    // Refund all bets
    for (const bet of bets) {
      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction
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
        currency: 'NGN',
        status: 'completed',
        description: `Round #${round.roundNumber} cancelled: ${reason || 'Admin action'}`,
        metadata: {
          betId: bet.id,
          roundId: round.id,
          cancelledBy: req.user.id
        }
      }, { transaction });
    }

    // Update round
    await round.update({
      status: 'cancelled',
      result: 'cancelled'
    }, { transaction });

    await transaction.commit();

    console.log(`🚫 Round ${round.roundNumber} cancelled by admin ${req.user.id}`);

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
    console.error('❌ Cancel round error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel round',
      error: error.message
    });
  }
};

// =====================================================
// PLATFORM SETTINGS
// =====================================================

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        fees: {
          platformFeePercentage: process.env.PLATFORM_FEE_PERCENTAGE || 1,
          losersPoolPlatformCut: process.env.LOSERS_POOL_PLATFORM_CUT || 30
        },
        betting: {
          minBetAmount: process.env.MIN_BET_AMOUNT || 100,
          maxBetAmount: process.env.MAX_BET_AMOUNT || 1000000,
          roundDurationMinutes: process.env.ROUND_DURATION_MINUTES || 5
        },
        payments: {
          minDeposit: 100,
          maxDeposit: 5000000,
          minWithdrawal: 1000
        }
      }
    });

  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};

// =====================================================
// ADD THESE TO YOUR EXISTING adminController.js
// =====================================================

// Add ReferralEarning to your imports at the top
const { User, Wallet, Transaction, Round, Bet, PendingDeposit, VirtualAccount, ReferralEarning } = require('../models');

// =====================================================
// INFLUENCER MANAGEMENT
// =====================================================

// @desc    Get all influencers
// @route   GET /api/admin/influencers
// @access  Private/Admin
const getAllInfluencers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const influencers = await User.findAndCountAll({
      where: { referralType: 'influencer' },
      attributes: [
        'id', 'username', 'email', 'phoneNumber', 'referralCode', 
        'influencerPercentage', 'referralBalance', 
        'totalReferralEarnings', 'referralCount', 'isActive', 'createdAt'
      ],
      order: [['totalReferralEarnings', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Get earnings stats for each influencer
    const influencerIds = influencers.rows.map(i => i.id);
    
    const earningsStats = await ReferralEarning.findAll({
      where: { 
        referrerId: { [Op.in]: influencerIds },
        type: 'loss_commission'
      },
      attributes: [
        'referrerId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCommissions'],
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'totalEarned']
      ],
      group: ['referrerId'],
      raw: true
    });

    const statsMap = earningsStats.reduce((acc, stat) => {
      acc[stat.referrerId] = {
        totalCommissions: parseInt(stat.totalCommissions || 0),
        totalEarned: parseFloat(stat.totalEarned || 0)
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        influencers: influencers.rows.map(i => ({
          id: i.id,
          username: i.username,
          email: i.email,
          phoneNumber: i.phoneNumber,
          referralCode: i.referralCode,
          percentage: parseFloat(i.influencerPercentage),
          referralBalance: parseFloat(i.referralBalance || 0),
          totalEarnings: parseFloat(i.totalReferralEarnings || 0),
          referralCount: i.referralCount || 0,
          isActive: i.isActive,
          createdAt: i.createdAt,
          stats: statsMap[i.id] || { totalCommissions: 0, totalEarned: 0 }
        })),
        pagination: {
          total: influencers.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(influencers.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get influencers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get influencers',
      error: error.message
    });
  }
};

// @desc    Get single influencer details
// @route   GET /api/admin/influencers/:userId
// @access  Private/Admin
const getInfluencerDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'email', 'phoneNumber', 'referralCode',
        'referralType', 'influencerPercentage', 'referralBalance',
        'totalReferralEarnings', 'referralCount', 'isActive', 'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get referred users
    const referredUsers = await User.findAll({
      where: { referredBy: userId },
      attributes: ['id', 'username', 'createdAt', 'hasPlacedFirstBet', 'isActive'],
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['totalDeposited', 'totalLost']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
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
      limit: 30
    });

    // Get earnings summary
    const earningsSummary = await ReferralEarning.findAll({
      where: { referrerId: userId },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'total'],
        [sequelize.fn('SUM', sequelize.col('betAmount')), 'totalBetAmount']
      ],
      group: ['type'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          referralCode: user.referralCode,
          referralType: user.referralType,
          percentage: parseFloat(user.influencerPercentage),
          referralBalance: parseFloat(user.referralBalance || 0),
          totalEarnings: parseFloat(user.totalReferralEarnings || 0),
          referralCount: user.referralCount || 0,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        earningsSummary: earningsSummary.map(s => ({
          type: s.type,
          count: parseInt(s.count || 0),
          total: parseFloat(s.total || 0),
          totalBetAmount: parseFloat(s.totalBetAmount || 0)
        })),
        referredUsers: referredUsers.map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.createdAt,
          hasPlacedBet: u.hasPlacedFirstBet,
          isActive: u.isActive,
          totalDeposited: u.wallet ? parseFloat(u.wallet.totalDeposited || 0) : 0,
          totalLost: u.wallet ? parseFloat(u.wallet.totalLost || 0) : 0
        })),
        recentEarnings: recentEarnings.map(e => ({
          id: e.id,
          username: e.referredUser?.username || 'Unknown',
          type: e.type,
          betAmount: parseFloat(e.betAmount),
          earnedAmount: parseFloat(e.earnedAmount),
          percentage: parseFloat(e.percentage),
          createdAt: e.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get influencer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get influencer details',
      error: error.message
    });
  }
};

// @desc    Upgrade user to influencer
// @route   POST /api/admin/influencers/:userId
// @access  Private/Admin
const upgradeToInfluencer = async (req, res) => {
  try {
    const { userId } = req.params;
    const { percentage } = req.body;

    // Validate percentage
    if (!percentage || isNaN(percentage) || percentage < 1 || percentage > 10) {
      return res.status(400).json({
        success: false,
        message: 'Percentage must be between 1 and 10'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot make admin an influencer'
      });
    }

    if (user.referralType === 'influencer') {
      return res.status(400).json({
        success: false,
        message: `${user.username} is already an influencer with ${user.influencerPercentage}% rate. Use update endpoint to change percentage.`
      });
    }

    await user.update({
      referralType: 'influencer',
      influencerPercentage: parseFloat(percentage)
    });

    console.log(`✅ Admin ${req.user.id} upgraded ${user.username} to influencer (${percentage}%)`);

    res.json({
      success: true,
      message: `${user.username} is now an influencer with ${percentage}% commission on referral losses`,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        referralCode: user.referralCode,
        referralType: 'influencer',
        percentage: parseFloat(percentage),
        referralCount: user.referralCount || 0
      }
    });

  } catch (error) {
    console.error('❌ Upgrade to influencer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade user to influencer',
      error: error.message
    });
  }
};

// @desc    Update influencer percentage
// @route   PUT /api/admin/influencers/:userId
// @access  Private/Admin
const updateInfluencerPercentage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { percentage } = req.body;

    // Validate percentage
    if (!percentage || isNaN(percentage) || percentage < 1 || percentage > 10) {
      return res.status(400).json({
        success: false,
        message: 'Percentage must be between 1 and 10'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.referralType !== 'influencer') {
      return res.status(400).json({
        success: false,
        message: `${user.username} is not an influencer. Upgrade them first.`
      });
    }

    const oldPercentage = parseFloat(user.influencerPercentage);

    await user.update({
      influencerPercentage: parseFloat(percentage)
    });

    console.log(`✅ Admin ${req.user.id} updated ${user.username}'s rate: ${oldPercentage}% → ${percentage}%`);

    res.json({
      success: true,
      message: `${user.username}'s commission rate updated from ${oldPercentage}% to ${percentage}%`,
      data: {
        userId: user.id,
        username: user.username,
        previousPercentage: oldPercentage,
        newPercentage: parseFloat(percentage)
      }
    });

  } catch (error) {
    console.error('❌ Update influencer percentage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update influencer percentage',
      error: error.message
    });
  }
};

// @desc    Downgrade influencer to normal referrer
// @route   DELETE /api/admin/influencers/:userId
// @access  Private/Admin
const downgradeInfluencer = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.referralType !== 'influencer') {
      return res.status(400).json({
        success: false,
        message: `${user.username} is not an influencer`
      });
    }

    const oldPercentage = parseFloat(user.influencerPercentage);

    await user.update({
      referralType: 'normal',
      influencerPercentage: 0
    });

    console.log(`✅ Admin ${req.user.id} downgraded ${user.username} from influencer to normal`);

    res.json({
      success: true,
      message: `${user.username} is now a normal referrer (5% on first bet only)`,
      data: {
        userId: user.id,
        username: user.username,
        previousType: 'influencer',
        previousPercentage: oldPercentage,
        newType: 'normal',
        newPercentage: 5
      }
    });

  } catch (error) {
    console.error('❌ Downgrade influencer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to downgrade influencer',
      error: error.message
    });
  }
};

// @desc    Get all referral stats (Admin overview)
// @route   GET /api/admin/referrals/stats
// @access  Private/Admin
const getReferralStats = async (req, res) => {
  try {
    // Total referrers
    const totalReferrers = await User.count({
      where: { referralCount: { [Op.gt]: 0 } }
    });

    // Total influencers
    const totalInfluencers = await User.count({
      where: { referralType: 'influencer' }
    });

    // Total users referred
    const totalReferred = await User.count({
      where: { referredBy: { [Op.ne]: null } }
    });

    // Total earnings paid out
    const earningsStats = await ReferralEarning.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'total']
      ],
      group: ['type'],
      raw: true
    });

    // Total pending in referral balances
    const pendingBalances = await User.sum('referralBalance', {
      where: { referralBalance: { [Op.gt]: 0 } }
    });

    // Top referrers
    const topReferrers = await User.findAll({
      where: { referralCount: { [Op.gt]: 0 } },
      attributes: [
        'id', 'username', 'referralType', 'influencerPercentage',
        'referralCount', 'totalReferralEarnings', 'referralBalance'
      ],
      order: [['totalReferralEarnings', 'DESC']],
      limit: 10
    });

    // Recent earnings
    const recentEarnings = await ReferralEarning.findAll({
      include: [
        { model: User, as: 'referrer', attributes: ['username'] },
        { model: User, as: 'referredUser', attributes: ['username'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const earningsByType = earningsStats.reduce((acc, stat) => {
      acc[stat.type] = {
        count: parseInt(stat.count || 0),
        total: parseFloat(stat.total || 0)
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        overview: {
          totalReferrers,
          totalInfluencers,
          normalReferrers: totalReferrers - totalInfluencers,
          totalReferred,
          totalEarningsPaid: Object.values(earningsByType).reduce((sum, e) => sum + e.total, 0),
          pendingInBalances: parseFloat(pendingBalances || 0)
        },
        earningsByType: {
          firstBet: earningsByType['first_bet'] || { count: 0, total: 0 },
          lossCommission: earningsByType['loss_commission'] || { count: 0, total: 0 }
        },
        topReferrers: topReferrers.map(u => ({
          id: u.id,
          username: u.username,
          type: u.referralType,
          percentage: u.referralType === 'influencer' ? parseFloat(u.influencerPercentage) : 5,
          referralCount: u.referralCount,
          totalEarnings: parseFloat(u.totalReferralEarnings || 0),
          balance: parseFloat(u.referralBalance || 0)
        })),
        recentEarnings: recentEarnings.map(e => ({
          id: e.id,
          referrer: e.referrer?.username || 'Unknown',
          referredUser: e.referredUser?.username || 'Unknown',
          type: e.type,
          betAmount: parseFloat(e.betAmount),
          earnedAmount: parseFloat(e.earnedAmount),
          percentage: parseFloat(e.percentage),
          createdAt: e.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral stats',
      error: error.message
    });
  }
};

// @desc    Search users to make influencer
// @route   GET /api/admin/users/search
// @access  Private/Admin
const searchUsersForInfluencer = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.findAll({
      where: {
        [Op.and]: [
          { role: 'user' }, // Only regular users
          {
            [Op.or]: [
              { username: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
              { referralCode: { [Op.iLike]: `%${q}%` } }
            ]
          }
        ]
      },
      attributes: [
        'id', 'username', 'email', 'referralCode', 
        'referralType', 'influencerPercentage', 'referralCount'
      ],
      limit: 20
    });

    res.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          referralCode: u.referralCode,
          referralType: u.referralType,
          percentage: u.referralType === 'influencer' ? parseFloat(u.influencerPercentage) : 5,
          referralCount: u.referralCount || 0,
          isInfluencer: u.referralType === 'influencer'
        }))
      }
    });

  } catch (error) {
    console.error('❌ Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};


          
// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  // Dashboard
  getDashboardStats,
  
  // User Management
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

// Influencer Management
  getAllInfluencers,
  getInfluencerDetails,
  upgradeToInfluencer,
  updateInfluencerPercentage,
  downgradeInfluencer,
  getReferralStats,
  searchUsersForInfluencer,
  
  // Settings
  getSettings
};
