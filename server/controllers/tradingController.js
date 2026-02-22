
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

// @desc    Get all rounds (previous, current, upcoming)
// @route   GET /api/trading/rounds/all
// @access  Public
const getAllRounds = async (req, res) => {
  try {
    const now = new Date();

    // Get previous completed round
    const previousRound = await Round.findOne({
      where: { status: 'completed' },
      order: [['endTime', 'DESC']],
      limit: 1
    });

    // Get current active round
    const currentRound = await Round.findOne({
      where: {
        status: {
          [Op.in]: ['active', 'locked']
        }
      },
      order: [['startTime', 'ASC']]
    });

    // Get next upcoming round
    const upcomingRound = await Round.findOne({
      where: { 
        status: 'upcoming',
        startTime: { [Op.gt]: now }
      },
      order: [['startTime', 'ASC']]
    });

    // Calculate multipliers for current round if exists
    let currentRoundData = null;
    if (currentRound) {
      const totalUpAmount = parseFloat(currentRound.totalUpAmount);
      const totalDownAmount = parseFloat(currentRound.totalDownAmount);
      const totalPool = totalUpAmount + totalDownAmount;
      
      const upMultiplier = totalPool > 0 && totalUpAmount > 0
        ? roundToTwo((totalPool * 0.7) / totalUpAmount + 1)
        : 1.8;
      const downMultiplier = totalPool > 0 && totalDownAmount > 0
        ? roundToTwo((totalPool * 0.7) / totalDownAmount + 1)
        : 1.8;

      currentRoundData = {
        ...currentRound.toJSON(),
        upMultiplier,
        downMultiplier,
        totalPool: roundToTwo(totalPool),
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount)
      };
    }

    res.json({
      success: true,
      previousRound,
      currentRound: currentRoundData,
      upcomingRound
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

// @desc    Get current BTC price
// @route   GET /api/trading/current-price
// @access  Public
const getCurrentPrice = async (req, res) => {
  try {
    const price = priceService.getPrice();
    
    res.json({
      success: true,
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get price error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get current price',
      error: error.message
    });
  }
};

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
        round: null
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
      : 1.8;
    const downMultiplier = totalPool > 0 && totalDownAmount > 0 
      ? roundToTwo((totalPool * 0.7) / totalDownAmount + 1) 
      : 1.8;

    res.json({
      success: true,
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
        round: null
      });
    }

    res.json({
      success: true,
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        startTime: round.startTime,
        endTime: round.endTime,
        timeUntilStart: Math.max(0, new Date(round.startTime) - new Date())
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
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide roundId, prediction (up/down) and amount'
      });
    }

    // Validate prediction
    if (!['up', 'down'].includes(prediction.toLowerCase())) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Prediction must be "up" or "down"'
      });
    }

    // Validate bet amount
    const amountValidation = validateBetAmount(amount);
    if (!amountValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: amountValidation.message
      });
    }

    // Get round
    const round = await Round.findByPk(roundId, { transaction });

    if (!round) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    // Check if round is active
    if (round.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot place bet. Round is ${round.status}`
      });
    }

    // Check if round is about to lock
    const now = new Date();
    if (now >= new Date(round.lockTime)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Betting is closed for this round'
      });
    }

    // Get user's wallet with lock
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const availableBalance = parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance);

    // Check balance
    if (amount > availableBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You have ₦${roundToTwo(availableBalance)} available`
      });
    }

    // Check if user already has a bet in this round
    const existingBet = await Bet.findOne({
      where: {
        userId: req.user.id,
        roundId: round.id
      },
      transaction
    });

    if (existingBet) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You already have a bet in this round'
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

    // Update wallet
    await wallet.update({
      nairaBalance: balanceBefore - amount,
      lockedBalance: parseFloat(wallet.lockedBalance) + stakeAmount
    }, { transaction });

    // Create transaction record
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

    // Emit socket events if socket exists
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('bet_placed', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          prediction,
          amount: stakeAmount
        });
      }
    } catch (socketError) {
      console.log('Socket emit error:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      bet: {
        id: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: bet.prediction,
        amount: parseFloat(bet.totalAmount),
        totalAmount: parseFloat(bet.totalAmount),
        feeAmount: parseFloat(bet.feeAmount),
        stakeAmount: parseFloat(bet.stakeAmount),
        result: bet.result,
        createdAt: bet.createdAt
      },
      wallet: {
        nairaBalance: roundToTwo(balanceBefore - amount),
        lockedBalance: roundToTwo(parseFloat(wallet.lockedBalance) + stakeAmount)
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

    const activeBets = bets.map(bet => {
      const round = bet.round;
      const priceChange = currentPrice - round.startPrice;
      const isWinning = (bet.prediction === 'up' && priceChange > 0) || 
                        (bet.prediction === 'down' && priceChange < 0);

      return {
        id: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: bet.prediction,
        amount: parseFloat(bet.totalAmount),
        totalAmount: parseFloat(bet.totalAmount),
        stakeAmount: parseFloat(bet.stakeAmount),
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
      activeBets
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

    res.json({
      success: true,
      bets: bets.rows,
      pagination: {
        total: bets.count,
        page: parseInt(page),
        pages: Math.ceil(bets.count / parseInt(limit))
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

// @desc    Get round history
// @route   GET /api/trading/rounds/history
// @access  Public
const getRoundHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const rounds = await Round.findAndCountAll({
      where: { status: 'completed' },
      order: [['roundNumber', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      rounds: rounds.rows,
      pagination: {
        total: rounds.count,
        page: parseInt(page),
        pages: Math.ceil(rounds.count / parseInt(limit))
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
        }]
      }]
    });

    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    res.json({
      success: true,
      round
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
    const totalRounds = await Round.count({ where: { status: 'completed' } });
    const totalBets = await Bet.count();

    res.json({
      success: true,
      stats: {
        totalRounds,
        totalBets,
        currentPrice: priceService.getPrice()
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
    const { limit = 10 } = req.query;

    const leaderboard = await Bet.findAll({
      where: { result: 'win' },
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

    res.json({
      success: true,
      leaderboard
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
  getAllRounds,
  getCurrentPrice,
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
