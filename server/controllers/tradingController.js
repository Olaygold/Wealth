
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

// ============================================================
// @desc    Get all rounds (previous, current, upcoming)
// @route   GET /api/trading/rounds/all
// @access  Public
// ============================================================
const getAllRounds = async (req, res) => {
  try {
    const now = new Date();

    // Get previous completed round
    const previousRound = await Round.findOne({
      where: { status: 'completed' },
      order: [['endTime', 'DESC']],
      limit: 1
    });

    // Get current active/locked round
    const currentRound = await Round.findOne({
      where: {
        status: { [Op.in]: ['active', 'locked'] }
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

    // Process current round data with multipliers
    let currentRoundData = null;
    if (currentRound) {
      const totalUpAmount = parseFloat(currentRound.totalUpAmount) || 0;
      const totalDownAmount = parseFloat(currentRound.totalDownAmount) || 0;
      const totalPool = totalUpAmount + totalDownAmount;
      
      // ✅ FIXED: Correct multiplier calculation
      let upMultiplier = 1.0;
      let downMultiplier = 1.0;
      let upMultiplierDisplay = '1.00';
      let downMultiplierDisplay = '1.00';

      if (totalUpAmount > 0 && totalDownAmount > 0) {
        // Both sides have bets - calculate real multipliers
        // Winners get: stake + (70% of losers pool * their share)
        upMultiplier = roundToTwo(1 + (totalDownAmount * 0.7) / totalUpAmount);
        downMultiplier = roundToTwo(1 + (totalUpAmount * 0.7) / totalDownAmount);
        upMultiplierDisplay = `${upMultiplier}x`;
        downMultiplierDisplay = `${downMultiplier}x`;
      } else if (totalUpAmount > 0 && totalDownAmount === 0) {
        // Only UP bets exist
        upMultiplier = 1.0;
        downMultiplier = 0;
        upMultiplierDisplay = '1x (no opponents)';
        downMultiplierDisplay = 'N/A';
      } else if (totalDownAmount > 0 && totalUpAmount === 0) {
        // Only DOWN bets exist
        upMultiplier = 0;
        downMultiplier = 1.0;
        upMultiplierDisplay = 'N/A';
        downMultiplierDisplay = '1x (no opponents)';
      } else {
        // No bets yet
        upMultiplierDisplay = '~1.8x';
        downMultiplierDisplay = '~1.8x';
      }

      // Calculate timing
      const bettingEndsIn = Math.max(0, Math.floor((new Date(currentRound.lockTime) - now) / 1000));
      const roundEndsIn = Math.max(0, Math.floor((new Date(currentRound.endTime) - now) / 1000));
      const canBet = currentRound.status === 'active' && bettingEndsIn > 10;

      currentRoundData = {
        id: currentRound.id,
        roundNumber: currentRound.roundNumber,
        status: currentRound.status,
        startTime: currentRound.startTime,
        lockTime: currentRound.lockTime,
        endTime: currentRound.endTime,
        startPrice: currentRound.startPrice,
        totalUpBets: currentRound.totalUpBets || 0,
        totalDownBets: currentRound.totalDownBets || 0,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        totalPool: roundToTwo(totalPool),
        upMultiplier: upMultiplierDisplay,
        downMultiplier: downMultiplierDisplay,
        upMultiplierRaw: upMultiplier,
        downMultiplierRaw: downMultiplier,
        bettingEndsIn,
        roundEndsIn,
        canBet
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

// ============================================================
// @desc    Get current BTC price
// @route   GET /api/trading/current-price
// @access  Public
// ============================================================
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

// ============================================================
// @desc    Get current active round
// @route   GET /api/trading/current-round
// @access  Public
// ============================================================
const getCurrentRound = async (req, res) => {
  try {
    const now = new Date();
    
    const round = await Round.findOne({
      where: {
        status: { [Op.in]: ['active', 'locked'] }
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

    // Calculate pool stats
    const upBets = round.bets.filter(b => b.prediction === 'up');
    const downBets = round.bets.filter(b => b.prediction === 'down');

    const totalUpAmount = upBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
    const totalDownAmount = downBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
    const totalPool = totalUpAmount + totalDownAmount;

    const currentPrice = priceService.getPrice();

    // ✅ FIXED: Correct multiplier calculation
    let upMultiplier = 1.0;
    let downMultiplier = 1.0;
    let upMultiplierDisplay = '1.00';
    let downMultiplierDisplay = '1.00';

    if (totalUpAmount > 0 && totalDownAmount > 0) {
      upMultiplier = roundToTwo(1 + (totalDownAmount * 0.7) / totalUpAmount);
      downMultiplier = roundToTwo(1 + (totalUpAmount * 0.7) / totalDownAmount);
      upMultiplierDisplay = `${upMultiplier}x`;
      downMultiplierDisplay = `${downMultiplier}x`;
    } else if (totalUpAmount > 0 && totalDownAmount === 0) {
      upMultiplier = 1.0;
      upMultiplierDisplay = '1x (no opponents)';
      downMultiplierDisplay = 'N/A';
    } else if (totalDownAmount > 0 && totalUpAmount === 0) {
      downMultiplier = 1.0;
      upMultiplierDisplay = 'N/A';
      downMultiplierDisplay = '1x (no opponents)';
    } else {
      upMultiplierDisplay = '~1.8x';
      downMultiplierDisplay = '~1.8x';
    }

    // Timing calculations
    const bettingEndsIn = Math.max(0, Math.floor((new Date(round.lockTime) - now) / 1000));
    const roundEndsIn = Math.max(0, Math.floor((new Date(round.endTime) - now) / 1000));
    const canBet = round.status === 'active' && bettingEndsIn > 10;

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
        upMultiplier: upMultiplierDisplay,
        downMultiplier: downMultiplierDisplay,
        upMultiplierRaw: upMultiplier,
        downMultiplierRaw: downMultiplier,
        bettingEndsIn,
        roundEndsIn,
        canBet
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

// ============================================================
// @desc    Get upcoming round
// @route   GET /api/trading/upcoming-round
// @access  Public
// ============================================================
const getUpcomingRound = async (req, res) => {
  try {
    const now = new Date();
    
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

    const startsIn = Math.max(0, Math.floor((new Date(round.startTime) - now) / 1000));

    res.json({
      success: true,
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        startTime: round.startTime,
        lockTime: round.lockTime,
        endTime: round.endTime,
        startsIn
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

// ============================================================
// @desc    Place a bet
// @route   POST /api/trading/bet
// @access  Private
// ============================================================
const placeBet = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { roundId, prediction, amount } = req.body;

    // ===== VALIDATION =====
    if (!roundId || !prediction || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide roundId, prediction (up/down) and amount'
      });
    }

    const predictionLower = prediction.toLowerCase();
    if (!['up', 'down'].includes(predictionLower)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Prediction must be "up" or "down"'
      });
    }

    const betAmount = parseFloat(amount);
    
    if (isNaN(betAmount) || betAmount < 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimum bet is ₦100'
      });
    }

    if (betAmount > 100000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Maximum bet is ₦100,000'
      });
    }

    // ===== GET ROUND =====
    const round = await Round.findByPk(roundId, { transaction });

    if (!round) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    if (round.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: round.status === 'locked' 
          ? 'Betting is closed for this round. Wait for the next round.'
          : `Cannot place bet. Round is ${round.status}`
      });
    }

    // Check timing
    const now = new Date();
    const lockTime = new Date(round.lockTime);
    const timeUntilLock = (lockTime - now) / 1000;

    if (timeUntilLock < 10) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Betting closes in less than 10 seconds. Please wait for next round.'
      });
    }

    // ===== GET WALLET =====
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found. Please contact support.'
      });
    }

    const walletBalance = parseFloat(wallet.nairaBalance);
    const lockedBalance = parseFloat(wallet.lockedBalance);
    const availableBalance = walletBalance - lockedBalance;

    // ✅ FIXED: Check against AVAILABLE balance
    if (betAmount > availableBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You have ₦${roundToTwo(availableBalance).toLocaleString()} available.`,
        available: roundToTwo(availableBalance),
        requested: betAmount
      });
    }

    // ===== CHECK EXISTING BET =====
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
        message: 'You already have a bet in this round',
        existingBet: {
          prediction: existingBet.prediction,
          amount: existingBet.totalAmount
        }
      });
    }

    // ===== CALCULATE FEE & STAKE =====
    const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 20;
    const feeAmount = roundToTwo((betAmount * feePercentage) / 100);
    const stakeAmount = roundToTwo(betAmount - feeAmount);

    const balanceBefore = walletBalance;

    // ===== CREATE BET =====
    const bet = await Bet.create({
      userId: req.user.id,
      roundId: round.id,
      prediction: predictionLower,
      totalAmount: betAmount,
      feeAmount: feeAmount,
      stakeAmount: stakeAmount,
      result: 'pending'
    }, { transaction });

    // ✅ FIXED: Deduct FULL bet amount, lock only stake
    const newBalance = roundToTwo(walletBalance - betAmount);
    const newLockedBalance = roundToTwo(stakeAmount);

    await wallet.update({
      nairaBalance: newBalance,
      lockedBalance: newLockedBalance
    }, { transaction });

    // ===== CREATE TRANSACTION RECORD =====
    await Transaction.create({
      userId: req.user.id,
      type: 'bet_place',
      method: 'internal',
      amount: betAmount,
      status: 'completed',
      description: `Bet ₦${betAmount.toLocaleString()} on ${predictionLower.toUpperCase()} - Round #${round.roundNumber}`,
      metadata: {
        betId: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: predictionLower,
        totalAmount: betAmount,
        feeAmount: feeAmount,
        stakeAmount: stakeAmount,
        feePercentage: `${feePercentage}%`
      },
      balanceBefore: balanceBefore,
      balanceAfter: newBalance
    }, { transaction });

    // ===== UPDATE ROUND TOTALS =====
    if (predictionLower === 'up') {
      await round.update({
        totalUpAmount: roundToTwo(parseFloat(round.totalUpAmount) + stakeAmount),
        totalUpBets: round.totalUpBets + 1,
        totalFeeCollected: roundToTwo(parseFloat(round.totalFeeCollected) + feeAmount)
      }, { transaction });
    } else {
      await round.update({
        totalDownAmount: roundToTwo(parseFloat(round.totalDownAmount) + stakeAmount),
        totalDownBets: round.totalDownBets + 1,
        totalFeeCollected: roundToTwo(parseFloat(round.totalFeeCollected) + feeAmount)
      }, { transaction });
    }

    await transaction.commit();

    // ===== EMIT SOCKET EVENTS =====
    try {
      const io = req.app.get('io');
      if (io) {
        // Broadcast bet placed to all
        io.emit('bet_placed', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          prediction: predictionLower,
          stakeAmount: stakeAmount,
          totalUpAmount: predictionLower === 'up' 
            ? roundToTwo(parseFloat(round.totalUpAmount) + stakeAmount)
            : parseFloat(round.totalUpAmount),
          totalDownAmount: predictionLower === 'down'
            ? roundToTwo(parseFloat(round.totalDownAmount) + stakeAmount)
            : parseFloat(round.totalDownAmount),
          totalUpBets: predictionLower === 'up' ? round.totalUpBets + 1 : round.totalUpBets,
          totalDownBets: predictionLower === 'down' ? round.totalDownBets + 1 : round.totalDownBets
        });

        // Send balance update to this user only
        io.to(req.user.id).emit('balance_update', {
          nairaBalance: newBalance,
          lockedBalance: newLockedBalance,
          availableBalance: roundToTwo(newBalance - newLockedBalance)
        });
      }
    } catch (socketError) {
      console.log('Socket emit error (non-critical):', socketError.message);
    }

    // ===== SUCCESS RESPONSE =====
    res.status(201).json({
      success: true,
      message: `Bet placed! ₦${betAmount.toLocaleString()} on ${predictionLower.toUpperCase()}`,
      bet: {
        id: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: predictionLower,
        totalAmount: betAmount,
        feeAmount: feeAmount,
        stakeAmount: stakeAmount,
        feePercentage: `${feePercentage}%`
      },
      wallet: {
        previousBalance: balanceBefore,
        newBalance: newBalance,
        lockedBalance: newLockedBalance,
        availableBalance: roundToTwo(newBalance - newLockedBalance),
        deducted: betAmount
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Place bet error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to place bet. Please try again.',
      error: error.message
    });
  }
};

// ============================================================
// @desc    Get user's active bets
// @route   GET /api/trading/my-bets/active
// @access  Private
// ============================================================
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
          status: { [Op.in]: ['active', 'locked'] }
        },
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    const currentPrice = priceService.getPrice();

    const activeBets = bets.map(bet => {
      const round = bet.round;
      
      if (!round) {
        return {
          id: bet.id,
          prediction: bet.prediction,
          amount: parseFloat(bet.totalAmount),
          stakeAmount: parseFloat(bet.stakeAmount),
          status: 'waiting'
        };
      }

      const priceChange = currentPrice - parseFloat(round.startPrice);
      const isWinning = (bet.prediction === 'up' && priceChange > 0) || 
                        (bet.prediction === 'down' && priceChange < 0);

      const now = new Date();
      const bettingEndsIn = Math.max(0, Math.floor((new Date(round.lockTime) - now) / 1000));
      const roundEndsIn = Math.max(0, Math.floor((new Date(round.endTime) - now) / 1000));

      return {
        id: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: bet.prediction,
        amount: parseFloat(bet.totalAmount),
        stakeAmount: parseFloat(bet.stakeAmount),
        feeAmount: parseFloat(bet.feeAmount),
        roundStatus: round.status,
        startPrice: parseFloat(round.startPrice),
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo((priceChange / parseFloat(round.startPrice)) * 100),
        isCurrentlyWinning: isWinning,
        bettingEndsIn,
        roundEndsIn,
        endTime: round.endTime
      };
    });

    res.json({
      success: true,
      activeBets: activeBets.filter(bet => bet.roundNumber), // Only return bets with valid rounds
      total: activeBets.length
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

// ============================================================
// @desc    Get user's bet history
// @route   GET /api/trading/my-bets/history
// @access  Private
// ============================================================
const getMyBetHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, result } = req.query;

    const where = {
      userId: req.user.id,
      result: { [Op.ne]: 'pending' }
    };

    if (result && ['win', 'loss', 'refund'].includes(result)) {
      where.result = result;
    }

    const { count, rows: bets } = await Bet.findAndCountAll({
      where,
      include: [{
        model: Round,
        as: 'round',
        attributes: ['roundNumber', 'startPrice', 'endPrice', 'result', 'startTime', 'endTime']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Calculate stats
    const stats = await Bet.findAll({
      where: {
        userId: req.user.id,
        result: { [Op.ne]: 'pending' }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBets'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'win' THEN 1 ELSE 0 END")), 'wins'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'loss' THEN 1 ELSE 0 END")), 'losses'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'refund' THEN 1 ELSE 0 END")), 'refunds'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalWagered'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayout'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'netProfit']
      ],
      raw: true
    });

    const statistics = stats[0] || {};

    res.json({
      success: true,
      bets,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(count / parseInt(limit))
      },
      statistics: {
        totalBets: parseInt(statistics.totalBets) || 0,
        wins: parseInt(statistics.wins) || 0,
        losses: parseInt(statistics.losses) || 0,
        refunds: parseInt(statistics.refunds) || 0,
        winRate: statistics.totalBets > 0 
          ? roundToTwo((parseInt(statistics.wins) / parseInt(statistics.totalBets)) * 100) 
          : 0,
        totalWagered: roundToTwo(parseFloat(statistics.totalWagered) || 0),
        totalPayout: roundToTwo(parseFloat(statistics.totalPayout) || 0),
        netProfit: roundToTwo(parseFloat(statistics.netProfit) || 0)
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

// ============================================================
// @desc    Get round history (completed rounds)
// @route   GET /api/trading/rounds/history
// @access  Public
// ============================================================
const getRoundHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { count, rows: rounds } = await Round.findAndCountAll({
      where: { status: 'completed' },
      attributes: [
        'id', 'roundNumber', 'status', 'startTime', 'lockTime', 'endTime',
        'startPrice', 'endPrice', 'result',
        'totalUpAmount', 'totalDownAmount', 'totalUpBets', 'totalDownBets',
        'prizePool', 'platformCut'
      ],
      order: [['roundNumber', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Add price change to each round
    const roundsWithChange = rounds.map(round => {
      const startPrice = parseFloat(round.startPrice) || 0;
      const endPrice = parseFloat(round.endPrice) || 0;
      const priceChange = endPrice - startPrice;
      const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

      return {
        ...round.toJSON(),
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange)
      };
    });

    res.json({
      success: true,
      rounds: roundsWithChange,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
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

// ============================================================
// @desc    Get specific round details
// @route   GET /api/trading/rounds/:roundId
// @access  Public
// ============================================================
const getRoundDetails = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findByPk(roundId, {
      include: [{
        model: Bet,
        as: 'bets',
        attributes: ['id', 'prediction', 'totalAmount', 'stakeAmount', 'result', 'payout', 'profit'],
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

    // Calculate stats
    const stats = {
      totalBets: round.bets.length,
      upBets: round.bets.filter(b => b.prediction === 'up').length,
      downBets: round.bets.filter(b => b.prediction === 'down').length,
      winners: round.bets.filter(b => b.result === 'win').length,
      losers: round.bets.filter(b => b.result === 'loss').length,
      refunds: round.bets.filter(b => b.result === 'refund').length
    };

    res.json({
      success: true,
      round: {
        ...round.toJSON(),
        stats
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

// ============================================================
// @desc    Get platform statistics
// @route   GET /api/trading/stats
// @access  Public
// ============================================================
const getPlatformStats = async (req, res) => {
  try {
    const totalRounds = await Round.count({ where: { status: 'completed' } });
    const totalBets = await Bet.count();
    const activeBets = await Bet.count({ where: { result: 'pending' } });

    // Calculate volume
    const volumeStats = await Bet.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalVolume'],
        [sequelize.fn('SUM', sequelize.col('feeAmount')), 'totalFees'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayouts']
      ],
      raw: true
    });

    // Get unique users
    const uniqueUsers = await Bet.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'count']],
      raw: true
    });

    const currentPrice = priceService.getPrice();

    res.json({
      success: true,
      stats: {
        totalRounds,
        totalBets,
        activeBets,
        totalVolume: roundToTwo(parseFloat(volumeStats[0]?.totalVolume) || 0),
        totalFees: roundToTwo(parseFloat(volumeStats[0]?.totalFees) || 0),
        totalPayouts: roundToTwo(parseFloat(volumeStats[0]?.totalPayouts) || 0),
        activeUsers: parseInt(uniqueUsers[0]?.count) || 0,
        currentPrice
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

// ============================================================
// @desc    Get leaderboard
// @route   GET /api/trading/leaderboard
// @access  Public
// ============================================================
const getLeaderboard = async (req, res) => {
  try {
    const { period = 'all', limit = 10 } = req.query;

    let timeFilter = {};
    const now = new Date();
    
    if (period === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      timeFilter = { createdAt: { [Op.gte]: today } };
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFilter = { createdAt: { [Op.gte]: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayout'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalWins']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['username']
      }],
      group: ['userId', 'user.id', 'user.username'],
      order: [[sequelize.literal('"totalProfit"'), 'DESC']],
      limit: parseInt(limit)
    });

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user?.username || 'Anonymous',
      totalProfit: roundToTwo(parseFloat(entry.dataValues.totalProfit) || 0),
      totalPayout: roundToTwo(parseFloat(entry.dataValues.totalPayout) || 0),
      totalWins: parseInt(entry.dataValues.totalWins) || 0
    }));

    res.json({
      success: true,
      period,
      leaderboard: formattedLeaderboard
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

// ============================================================
// EXPORTS
// ============================================================
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
