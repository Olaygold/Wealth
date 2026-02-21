const { Round, Bet, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const priceService = require('../services/priceService');
const {
  validateBetAmount,
  calculatePlatformFee,
  calculateStakeAmount,
  roundToTwo
} = require('../utils/helpers');

// @desc    Get current active round
// @route   GET /api/trading/current-round
// @access  Public
const getCurrentRound = async (req, res) => {
  try {
    const round = await Round.findOne({
      where: {
        status: {
          [Op.in]: ['active', 'locked']
        }
      },
      include: [{
        model: Bet,
        as: 'bets',
        attributes: ['prediction', 'stakeAmount']
      }]
    });

    if (!round) {
      return res.json({
        success: true,
        message: 'No active round',
        data: null
      });
    }

    // Calculate pool statistics
    const upBets = round.bets.filter(b => b.prediction === 'up');
    const downBets = round.bets.filter(b => b.prediction === 'down');

    const totalUpAmount = upBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
    const totalDownAmount = downBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

    // Get current price
    const currentPrice = priceService.getPrice();

    // Calculate potential multipliers
    const totalPool = totalUpAmount + totalDownAmount;
    const upMultiplier = totalPool > 0 && totalUpAmount > 0 
      ? roundToTwo((totalPool * 0.7) / totalUpAmount + 1) 
      : 1;
    const downMultiplier = totalPool > 0 && totalDownAmount > 0 
      ? roundToTwo((totalPool * 0.7) / totalDownAmount + 1) 
      : 1;

    res.json({
      success: true,
      data: {
        round: {
          id: round.id,
          roundNumber: round.roundNumber,
          status: round.status,
          startTime: round.startTime,
          lockTime: round.lockTime,
          endTime: round.endTime,
          startPrice: round.startPrice,
          currentPrice,
          totalUpBets: upBets.length,
          totalDownBets: downBets.length,
          totalUpAmount: roundToTwo(totalUpAmount),
          totalDownAmount: roundToTwo(totalDownAmount),
          totalPool: roundToTwo(totalPool),
          upMultiplier,
          downMultiplier,
          timeRemaining: Math.max(0, new Date(round.endTime) - new Date()),
          canBet: round.status === 'active'
        }
      }
    });

  } catch (error) {
    console.error('Get current round error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get current round',
      error: error.message
    });
  }
};

// @desc    Get upcoming round
// @route   GET /api/trading/upcoming-round
// @access  Public
const getUpcomingRound = async (req, res) => {
  try {
    const round = await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });

    if (!round) {
      return res.json({
        success: true,
        message: 'No upcoming round',
        data: null
      });
    }

    res.json({
      success: true,
      data: {
        round: {
          id: round.id,
          roundNumber: round.roundNumber,
          startTime: round.startTime,
          endTime: round.endTime,
          timeUntilStart: Math.max(0, new Date(round.startTime) - new Date())
        }
      }
    });

  } catch (error) {
    console.error('Get upcoming round error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming round',
      error: error.message
    });
  }
};

// @desc    Place a bet
// @route   POST /api/trading/bet
// @access  Private
const placeBet = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roundId, prediction, amount } = req.body;

    // Validation
    if (!roundId || !prediction || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roundId, prediction (up/down) and amount'
      });
    }

    // Validate prediction
    if (!['up', 'down'].includes(prediction.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Prediction must be "up" or "down"'
      });
    }

    // Validate bet amount
    const amountValidation = validateBetAmount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: amountValidation.message
      });
    }

    // Get round
    const round = await Round.findByPk(roundId);

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    // Check if round is active and accepting bets
    if (round.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot place bet. Round is ${round.status}`,
        data: { roundStatus: round.status }
      });
    }

    // Check if round is about to lock (30 seconds before end)
    const now = new Date();
    if (now >= new Date(round.lockTime)) {
      return res.status(400).json({
        success: false,
        message: 'Betting is closed for this round'
      });
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id }
    });

    const availableBalance = parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance);

    // Check if user has sufficient balance
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          requested: amount,
          available: roundToTwo(availableBalance)
        }
      });
    }

    // Check if user already has a bet in this round
    const existingBet = await Bet.findOne({
      where: {
        userId: req.user.id,
        roundId: round.id
      }
    });

    if (existingBet) {
      return res.status(400).json({
        success: false,
        message: 'You already have a bet in this round',
        data: {
          existingBet: {
            prediction: existingBet.prediction,
            amount: existingBet.totalAmount
          }
        }
      });
    }

    // Calculate fee and stake
    const feeAmount = calculatePlatformFee(amount);
    const stakeAmount = calculateStakeAmount(amount);

    const balanceBefore = parseFloat(wallet.nairaBalance);

    // Create bet
    const bet = await Bet.create({
      userId: req.user.id,
      roundId: round.id,
      prediction: prediction.toLowerCase(),
      totalAmount: amount,
      feeAmount: roundToTwo(feeAmount),
      stakeAmount: roundToTwo(stakeAmount)
    }, { transaction });

    // Update wallet (deduct amount and add to locked balance)
    await wallet.update({
      nairaBalance: balanceBefore - amount,
      lockedBalance: parseFloat(wallet.lockedBalance) + stakeAmount
    }, { transaction });

    // Create transaction record for bet placement
    await Transaction.create({
      userId: req.user.id,
      type: 'bet_place',
      method: 'internal',
      amount,
      status: 'completed',
      description: `Bet placed: ${prediction.toUpperCase()} - Round #${round.roundNumber}`,
      metadata: {
        betId: bet.id,
        roundId: round.id,
        prediction,
        feeAmount,
        stakeAmount
      },
      balanceBefore,
      balanceAfter: balanceBefore - amount
    }, { transaction });

    // Create transaction record for fee
    await Transaction.create({
      userId: req.user.id,
      type: 'fee',
      method: 'internal',
      amount: feeAmount,
      status: 'completed',
      description: `Platform fee (20%) - Round #${round.roundNumber}`,
      metadata: {
        betId: bet.id,
        roundId: round.id
      }
    }, { transaction });

    // Update round totals
    if (prediction.toLowerCase() === 'up') {
      await round.update({
        totalUpAmount: parseFloat(round.totalUpAmount) + stakeAmount,
        totalUpBets: round.totalUpBets + 1,
        totalFeeCollected: parseFloat(round.totalFeeCollected) + feeAmount
      }, { transaction });
    } else {
      await round.update({
        totalDownAmount: parseFloat(round.totalDownAmount) + stakeAmount,
        totalDownBets: round.totalDownBets + 1,
        totalFeeCollected: parseFloat(round.totalFeeCollected) + feeAmount
      }, { transaction });
    }

    await transaction.commit();

    // Emit bet placed event via socket
    const io = req.app.get('io');
    io.emit('bet_placed', {
      roundId: round.id,
      roundNumber: round.roundNumber,
      prediction,
      amount: stakeAmount,
      totalUpAmount: prediction.toLowerCase() === 'up' 
        ? parseFloat(round.totalUpAmount) + stakeAmount 
        : round.totalUpAmount,
      totalDownAmount: prediction.toLowerCase() === 'down' 
        ? parseFloat(round.totalDownAmount) + stakeAmount 
        : round.totalDownAmount
    });

    // Emit balance update to user
    io.to(req.user.id).emit('balance_update', {
      nairaBalance: balanceBefore - amount,
      lockedBalance: parseFloat(wallet.lockedBalance) + stakeAmount
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: {
        bet: {
          id: bet.id,
          roundNumber: round.roundNumber,
          prediction: bet.prediction,
          totalAmount: bet.totalAmount,
          feeAmount: bet.feeAmount,
          stakeAmount: bet.stakeAmount,
          potentialPayout: 'Calculated at round end'
        },
        wallet: {
          newBalance: roundToTwo(balanceBefore - amount),
          lockedBalance: roundToTwo(parseFloat(wallet.lockedBalance) + stakeAmount)
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Place bet error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to place bet',
      error: error.message
    });
  }
};

// @desc    Get user's active bets
// @route   GET /api/trading/my-bets/active
// @access  Private
const getMyActiveBets = async (req, res) => {
  try {
    const bets = await Bet.findAll({
      where: {
        userId: req.user.id,
        result: 'pending'
      },
      include: [{
        model: Round,
        as: 'round',
        where: {
          status: {
            [Op.in]: ['active', 'locked']
          }
        }
      }],
      order: [['createdAt', 'DESC']]
    });

    const currentPrice = priceService.getPrice();

    const betsWithDetails = bets.map(bet => {
      const round = bet.round;
      const priceChange = currentPrice - round.startPrice;
      const isWinning = (bet.prediction === 'up' && priceChange > 0) || 
                        (bet.prediction === 'down' && priceChange < 0);

      return {
        id: bet.id,
        roundNumber: round.roundNumber,
        prediction: bet.prediction,
        totalAmount: bet.totalAmount,
        stakeAmount: bet.stakeAmount,
        roundStatus: round.status,
        startPrice: round.startPrice,
        currentPrice,
        priceChange: roundToTwo(priceChange),
        isCurrentlyWinning: isWinning,
        endTime: round.endTime,
        timeRemaining: Math.max(0, new Date(round.endTime) - new Date())
      };
    });

    res.json({
      success: true,
      data: {
        activeBets: betsWithDetails,
        total: betsWithDetails.length
      }
    });

  } catch (error) {
    console.error('Get active bets error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get active bets',
      error: error.message
    });
  }
};

// @desc    Get user's bet history
// @route   GET /api/trading/my-bets/history
// @access  Private
const getMyBetHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, result } = req.query;

    const where = {
      userId: req.user.id,
      result: {
        [Op.ne]: 'pending'
      }
    };

    if (result && ['win', 'loss', 'refund'].includes(result)) {
      where.result = result;
    }

    const bets = await Bet.findAndCountAll({
      where,
      include: [{
        model: Round,
        as: 'round',
        attributes: ['roundNumber', 'startPrice', 'endPrice', 'result', 'endTime']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Calculate statistics
    const stats = await Bet.findAll({
      where: {
        userId: req.user.id,
        result: {
          [Op.ne]: 'pending'
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBets'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'win' THEN 1 ELSE 0 END")), 'wins'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'loss' THEN 1 ELSE 0 END")), 'losses'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalWagered'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayout'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'netProfit']
      ],
      raw: true
    });

    const statistics = stats[0];

    res.json({
      success: true,
      data: {
        bets: bets.rows,
        pagination: {
          total: bets.count,
          page: parseInt(page),
          pages: Math.ceil(bets.count / parseInt(limit))
        },
        statistics: {
          totalBets: parseInt(statistics.totalBets) || 0,
          wins: parseInt(statistics.wins) || 0,
          losses: parseInt(statistics.losses) || 0,
          winRate: statistics.totalBets > 0 
            ? roundToTwo((statistics.wins / statistics.totalBets) * 100) 
            : 0,
          totalWagered: roundToTwo(parseFloat(statistics.totalWagered) || 0),
          totalPayout: roundToTwo(parseFloat(statistics.totalPayout) || 0),
          netProfit: roundToTwo(parseFloat(statistics.netProfit) || 0)
        }
      }
    });

  } catch (error) {
    console.error('Get bet history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get bet history',
      error: error.message
    });
  }
};

// @desc    Get round history (completed rounds)
// @route   GET /api/trading/rounds/history
// @access  Public
const getRoundHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const rounds = await Round.findAndCountAll({
      where: { status: 'completed' },
      attributes: [
        'id',
        'roundNumber',
        'startTime',
        'endTime',
        'startPrice',
        'endPrice',
        'result',
        'totalUpAmount',
        'totalDownAmount',
        'totalUpBets',
        'totalDownBets',
        'prizePool',
        'platformCut'
      ],
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
    console.error('Get round history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get round history',
      error: error.message
    });
  }
};

// @desc    Get specific round details
// @route   GET /api/trading/rounds/:roundId
// @access  Public
const getRoundDetails = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findByPk(roundId, {
      include: [{
        model: Bet,
        as: 'bets',
        include: [{
          model: User,
          as: 'user',
          attributes: ['username']
        }],
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    // Group bets by result if round is completed
    let betsByResult = null;
    if (round.status === 'completed') {
      betsByResult = {
        winners: round.bets.filter(b => b.result === 'win').length,
        losers: round.bets.filter(b => b.result === 'loss').length,
        refunds: round.bets.filter(b => b.result === 'refund').length
      };
    }

    res.json({
      success: true,
      data: {
        round: {
          ...round.toJSON(),
          betsByResult
        }
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

// @desc    Get platform statistics
// @route   GET /api/trading/stats
// @access  Public
const getPlatformStats = async (req, res) => {
  try {
    // Total rounds
    const totalRounds = await Round.count({
      where: { status: 'completed' }
    });

    // Total bets
    const totalBets = await Bet.count();

    // Total volume
    const volumeStats = await Bet.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalVolume'],
        [sequelize.fn('SUM', sequelize.col('feeAmount')), 'totalFees']
      ],
      raw: true
    });

    // Active users (users with at least 1 bet)
    const activeUsers = await Bet.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'count']],
      raw: true
    });

    // Recent winners
    const recentWinners = await Bet.findAll({
      where: {
        result: 'win',
        isPaid: true
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['username']
      }, {
        model: Round,
        as: 'round',
        attributes: ['roundNumber', 'endTime']
      }],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        totalRounds,
        totalBets,
        totalVolume: roundToTwo(parseFloat(volumeStats[0].totalVolume) || 0),
        totalFees: roundToTwo(parseFloat(volumeStats[0].totalFees) || 0),
        activeUsers: parseInt(activeUsers[0].count),
        currentPrice: priceService.getPrice(),
        recentWinners: recentWinners.map(bet => ({
          username: bet.user.username,
          roundNumber: bet.round.roundNumber,
          prediction: bet.prediction,
          payout: bet.payout,
          profit: bet.profit,
          time: bet.round.endTime
        }))
      }
    });

  } catch (error) {
    console.error('Get platform stats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform stats',
      error: error.message
    });
  }
};

// @desc    Get leaderboard
// @route   GET /api/trading/leaderboard
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const { period = 'all', limit = 10 } = req.query;

    let timeFilter = {};
    
    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      timeFilter = { createdAt: { [Op.gte]: today } };
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      timeFilter = { createdAt: { [Op.gte]: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      timeFilter = { createdAt: { [Op.gte]: monthAgo } };
    }

    const leaderboard = await Bet.findAll({
      where: {
        result: 'win',
        ...timeFilter
      },
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalWins']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['username']
      }],
      group: ['userId', 'user.id', 'user.username'],
      order: [[sequelize.literal('totalProfit'), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry['user.username'],
      totalProfit: roundToTwo(parseFloat(entry.totalProfit)),
      totalWins: parseInt(entry.totalWins)
    }));

    res.json({
      success: true,
      data: {
        period,
        leaderboard: formattedLeaderboard
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
      error: error.message
    });
  }
};

module.exports = {
  getCurrentRound,
  getUpcomingRound,
  placeBet,
  getMyActiveBets,
  getMyBetHistory,
  getRoundHistory,
  getRoundDetails,
  getPlatformStats,
  getLeaderboard
};
