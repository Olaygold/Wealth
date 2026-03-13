
const { Round, Bet, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const priceService = require('../services/priceService');

// Helper function
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// ============================================================
// HELPER: Calculate multipliers for UP and DOWN
// ============================================================
const calculateMultipliers = (totalUpAmount, totalDownAmount) => {
  let upRaw = 1.0;
  let downRaw = 1.0;
  let upDisplay = '~1.7x';
  let downDisplay = '~1.7x';

  if (totalUpAmount > 0 && totalDownAmount > 0) {
    upRaw = roundToTwo(1 + (totalDownAmount * 0.7) / totalUpAmount);
    downRaw = roundToTwo(1 + (totalUpAmount * 0.7) / totalDownAmount);
    upDisplay = `${upRaw}x`;
    downDisplay = `${downRaw}x`;
  } else if (totalUpAmount > 0 && totalDownAmount === 0) {
    upRaw = 1.0;
    downRaw = 0;
    upDisplay = '1x (refund if win)';
    downDisplay = 'N/A';
  } else if (totalDownAmount > 0 && totalUpAmount === 0) {
    upRaw = 0;
    downRaw = 1.0;
    upDisplay = 'N/A';
    downDisplay = '1x (refund if win)';
  }

  return { upRaw, downRaw, upDisplay, downDisplay };
};

// ============================================================
// @desc    Get all rounds (NEW FLOW: previous[], locked, active, upcoming)
// @route   GET /api/trading/rounds/all
// @access  Public
// ============================================================
const getAllRounds = async (req, res) => {
  try {
    const now = new Date();

    // ✅ Get last 3 COMPLETED rounds (history)
    const previousRounds = await Round.findAll({
      where: { status: 'completed' },
      order: [['endTime', 'DESC']],
      limit: 3
    });

    // ✅ Get LOCKED round (waiting for result, shows chart)
    const lockedRound = await Round.findOne({
      where: { status: 'locked' },
      order: [['lockTime', 'DESC']]
    });

    // ✅ Get ACTIVE round (for betting)
    const activeRound = await Round.findOne({
      where: { status: 'active' },
      order: [['startTime', 'DESC']]
    });

    // ✅ Get UPCOMING round
    const upcomingRound = await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });

    // ===== Format PREVIOUS ROUNDS =====
    const previousRoundsData = previousRounds.map(round => {
      const startPrice = parseFloat(round.startPrice) || 0;
      const endPrice = parseFloat(round.endPrice) || 0;
      const priceChange = endPrice - startPrice;
      const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

      return {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        result: round.result,
        startTime: round.startTime,
        lockTime: round.lockTime,
        endTime: round.endTime,
        startPrice: startPrice,
        endPrice: endPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        totalUpBets: round.totalUpBets || 0,
        totalDownBets: round.totalDownBets || 0,
        totalUpAmount: roundToTwo(parseFloat(round.totalUpAmount) || 0),
        totalDownAmount: roundToTwo(parseFloat(round.totalDownAmount) || 0),
        prizePool: roundToTwo(parseFloat(round.prizePool) || 0)
      };
    });

    // ===== Format LOCKED ROUND (with chart info) =====
    let lockedRoundData = null;
    if (lockedRound) {
      const totalUpAmount = parseFloat(lockedRound.totalUpAmount) || 0;
      const totalDownAmount = parseFloat(lockedRound.totalDownAmount) || 0;
      const totalPool = totalUpAmount + totalDownAmount;

      const currentPrice = priceService.getPrice();
      const startPrice = parseFloat(lockedRound.startPrice) || 0;
      const priceChange = currentPrice - startPrice;
      const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
      const currentDirection = priceChange >= 0 ? 'up' : 'down';

      const roundEndsIn = Math.max(0, Math.floor((new Date(lockedRound.endTime) - now) / 1000));

      lockedRoundData = {
        id: lockedRound.id,
        roundNumber: lockedRound.roundNumber,
        status: lockedRound.status,
        startTime: lockedRound.startTime,
        lockTime: lockedRound.lockTime,
        endTime: lockedRound.endTime,
        startPrice: startPrice,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        currentDirection: currentDirection,
        totalUpBets: lockedRound.totalUpBets || 0,
        totalDownBets: lockedRound.totalDownBets || 0,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        totalPool: roundToTwo(totalPool),
        roundEndsIn: roundEndsIn,
        // ✅ For chart persistence
        chartStartTime: lockedRound.startTime,
        chartLockTime: lockedRound.lockTime
      };
    }

    // ===== Format ACTIVE ROUND (for betting) =====
    let activeRoundData = null;
    if (activeRound) {
      const totalUpAmount = parseFloat(activeRound.totalUpAmount) || 0;
      const totalDownAmount = parseFloat(activeRound.totalDownAmount) || 0;
      const totalPool = totalUpAmount + totalDownAmount;
      
      const multipliers = calculateMultipliers(totalUpAmount, totalDownAmount);

      const currentPrice = priceService.getPrice();
      const startPrice = parseFloat(activeRound.startPrice) || 0;
      const priceChange = currentPrice - startPrice;
      const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

      const bettingEndsIn = Math.max(0, Math.floor((new Date(activeRound.lockTime) - now) / 1000));
      const roundEndsIn = Math.max(0, Math.floor((new Date(activeRound.endTime) - now) / 1000));
      const canBet = activeRound.status === 'active' && bettingEndsIn > 10;

      activeRoundData = {
        id: activeRound.id,
        roundNumber: activeRound.roundNumber,
        status: activeRound.status,
        startTime: activeRound.startTime,
        lockTime: activeRound.lockTime,
        endTime: activeRound.endTime,
        startPrice: startPrice,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        totalUpBets: activeRound.totalUpBets || 0,
        totalDownBets: activeRound.totalDownBets || 0,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        totalPool: roundToTwo(totalPool),
        upMultiplier: multipliers.upDisplay,
        downMultiplier: multipliers.downDisplay,
        upMultiplierRaw: multipliers.upRaw,
        downMultiplierRaw: multipliers.downRaw,
        bettingEndsIn,
        roundEndsIn,
        canBet
      };
    }

    // ===== Format UPCOMING ROUND =====
    let upcomingRoundData = null;
    if (upcomingRound) {
      const startsIn = Math.max(0, Math.floor((new Date(upcomingRound.startTime) - now) / 1000));

      upcomingRoundData = {
        id: upcomingRound.id,
        roundNumber: upcomingRound.roundNumber,
        status: upcomingRound.status,
        startTime: upcomingRound.startTime,
        lockTime: upcomingRound.lockTime,
        endTime: upcomingRound.endTime,
        startsIn
      };
    }

    res.json({
      success: true,
      // ✅ NEW STRUCTURE
      previousRounds: previousRoundsData,  // Array of last 3 completed
      lockedRound: lockedRoundData,        // Locked round with chart (5min countdown)
      activeRound: activeRoundData,        // Active round for betting
      upcomingRound: upcomingRoundData,    // Next upcoming round
      // ✅ Legacy support (backward compatibility)
      currentRound: activeRoundData || lockedRoundData,
      previousRound: previousRoundsData[0] || null,
      serverTime: now.toISOString()
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
// @desc    Get active round (for betting)
// @route   GET /api/trading/active-round
// @access  Public
// ============================================================
const getActiveRound = async (req, res) => {
  try {
    const now = new Date();
    
    const round = await Round.findOne({
      where: { status: 'active' },
      order: [['startTime', 'DESC']]
    });

    if (!round) {
      return res.json({
        success: true,
        message: 'No active round',
        round: null
      });
    }

    const totalUpAmount = parseFloat(round.totalUpAmount) || 0;
    const totalDownAmount = parseFloat(round.totalDownAmount) || 0;
    const totalPool = totalUpAmount + totalDownAmount;

    const multipliers = calculateMultipliers(totalUpAmount, totalDownAmount);

    const currentPrice = priceService.getPrice();
    const startPrice = parseFloat(round.startPrice) || 0;
    const priceChange = currentPrice - startPrice;
    const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

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
        startPrice: startPrice,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        totalUpBets: round.totalUpBets || 0,
        totalDownBets: round.totalDownBets || 0,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        totalPool: roundToTwo(totalPool),
        upMultiplier: multipliers.upDisplay,
        downMultiplier: multipliers.downDisplay,
        upMultiplierRaw: multipliers.upRaw,
        downMultiplierRaw: multipliers.downRaw,
        bettingEndsIn,
        roundEndsIn,
        canBet
      }
    });

  } catch (error) {
    console.error('Get active round error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get active round',
      error: error.message
    });
  }
};

// ============================================================
// @desc    Get locked round (waiting for result, shows chart)
// @route   GET /api/trading/locked-round
// @access  Public
// ============================================================
const getLockedRound = async (req, res) => {
  try {
    const now = new Date();
    
    const round = await Round.findOne({
      where: { status: 'locked' },
      order: [['lockTime', 'DESC']]
    });

    if (!round) {
      return res.json({
        success: true,
        message: 'No locked round',
        round: null
      });
    }

    const totalUpAmount = parseFloat(round.totalUpAmount) || 0;
    const totalDownAmount = parseFloat(round.totalDownAmount) || 0;
    const totalPool = totalUpAmount + totalDownAmount;

    const currentPrice = priceService.getPrice();
    const startPrice = parseFloat(round.startPrice) || 0;
    const priceChange = currentPrice - startPrice;
    const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
    const currentDirection = priceChange >= 0 ? 'up' : 'down';

    const roundEndsIn = Math.max(0, Math.floor((new Date(round.endTime) - now) / 1000));

    res.json({
      success: true,
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        startTime: round.startTime,
        lockTime: round.lockTime,
        endTime: round.endTime,
        startPrice: startPrice,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        currentDirection: currentDirection,
        totalUpBets: round.totalUpBets || 0,
        totalDownBets: round.totalDownBets || 0,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        totalPool: roundToTwo(totalPool),
        roundEndsIn: roundEndsIn,
        chartStartTime: round.startTime,
        chartLockTime: round.lockTime
      }
    });

  } catch (error) {
    console.error('Get locked round error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get locked round',
      error: error.message
    });
  }
};

// ============================================================
// @desc    Get previous completed rounds (history)
// @route   GET /api/trading/previous-rounds
// @access  Public
// ============================================================
const getPreviousRounds = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    
    const rounds = await Round.findAll({
      where: { status: 'completed' },
      order: [['endTime', 'DESC']],
      limit: Math.min(limit, 10)
    });

    const roundsData = rounds.map(round => {
      const startPrice = parseFloat(round.startPrice) || 0;
      const endPrice = parseFloat(round.endPrice) || 0;
      const priceChange = endPrice - startPrice;
      const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

      return {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        result: round.result,
        startTime: round.startTime,
        lockTime: round.lockTime,
        endTime: round.endTime,
        startPrice: startPrice,
        endPrice: endPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange),
        totalUpBets: round.totalUpBets || 0,
        totalDownBets: round.totalDownBets || 0,
        totalUpAmount: roundToTwo(parseFloat(round.totalUpAmount) || 0),
        totalDownAmount: roundToTwo(parseFloat(round.totalDownAmount) || 0),
        prizePool: roundToTwo(parseFloat(round.prizePool) || 0)
      };
    });

    res.json({
      success: true,
      rounds: roundsData,
      count: roundsData.length
    });

  } catch (error) {
    console.error('Get previous rounds error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get previous rounds',
      error: error.message
    });
  }
};

// ============================================================
// @desc    Get round chart data (for locked round display)
// @route   GET /api/trading/rounds/:roundId/chart
// @access  Public
// ============================================================
const getRoundChart = async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const round = await Round.findByPk(roundId);
    
    if (!round) {
      return res.status(404).json({
        success: false,
        message: 'Round not found'
      });
    }

    const currentPrice = priceService.getPrice();
    const startPrice = parseFloat(round.startPrice) || 0;
    const priceChange = currentPrice - startPrice;
    const percentChange = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

    // Get price history if available
    let priceHistory = [];
    if (priceService.getHistory) {
      priceHistory = priceService.getHistory(100);
    }

    res.json({
      success: true,
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        result: round.result,
        startTime: round.startTime,
        lockTime: round.lockTime,
        endTime: round.endTime,
        startPrice: startPrice,
        endPrice: round.endPrice ? parseFloat(round.endPrice) : null,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo(percentChange)
      },
      priceHistory: priceHistory,
      chartConfig: {
        startTime: round.startTime,
        endTime: round.endTime,
        startPrice: startPrice
      }
    });

  } catch (error) {
    console.error('Get round chart error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get chart data',
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
    
    // Get price history if available
    let history = [];
    if (priceService.getHistory) {
      history = priceService.getHistory(60);
    }
    
    res.json({
      success: true,
      price: parseFloat(price.toFixed(2)),
      history: history,
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
// @desc    Get current active/locked round (LEGACY - backward compatibility)
// @route   GET /api/trading/current-round
// @access  Public
// ============================================================
const getCurrentRound = async (req, res) => {
  try {
    const now = new Date();
    
    // First try active
    let round = await Round.findOne({
      where: { status: 'active' },
      order: [['startTime', 'DESC']]
    });

    // If no active, try locked
    if (!round) {
      round = await Round.findOne({
        where: { status: 'locked' },
        order: [['lockTime', 'DESC']]
      });
    }

    if (!round) {
      return res.json({
        success: true,
        message: 'No active round',
        round: null
      });
    }

    // Get bets for this round
    const bets = await Bet.findAll({
      where: { roundId: round.id },
      attributes: ['prediction', 'stakeAmount']
    });

    const upBets = bets.filter(b => b.prediction === 'up');
    const downBets = bets.filter(b => b.prediction === 'down');

    const totalUpAmount = upBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
    const totalDownAmount = downBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
    const totalPool = totalUpAmount + totalDownAmount;

    const currentPrice = priceService.getPrice();
    const multipliers = calculateMultipliers(totalUpAmount, totalDownAmount);

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
        upMultiplier: multipliers.upDisplay,
        downMultiplier: multipliers.downDisplay,
        upMultiplierRaw: multipliers.upRaw,
        downMultiplierRaw: multipliers.downRaw,
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
// @desc    Place a bet - NO UPFRONT FEE
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

    // ✅ Only allow betting on ACTIVE rounds
    if (round.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: round.status === 'locked' 
          ? 'This round is locked. Waiting for result. Place bet on the new active round!'
          : `Cannot place bet. Round is ${round.status}`
      });
    }

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

    const walletBalance = parseFloat(wallet.nairaBalance) || 0;
    const currentLockedBalance = parseFloat(wallet.lockedBalance) || 0;
    const availableBalance = roundToTwo(walletBalance - currentLockedBalance);

    if (betAmount > availableBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You have ₦${availableBalance.toLocaleString()} available.`,
        available: availableBalance,
        requested: betAmount
      });
    }

    // ===== CHECK EXISTING BET =====
    const existingBet = await Bet.findOne({
      where: {
        userId: req.user.id,
        roundId: round.id,
        isBot: false
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
          amount: existingBet.totalAmount || existingBet.stakeAmount
        }
      });
    }

    // ✅ NO UPFRONT FEE - Full amount goes to pool
    const balanceBefore = walletBalance;

    // ===== CREATE BET =====
    const bet = await Bet.create({
      userId: req.user.id,
      roundId: round.id,
      roundNumber: round.roundNumber,
      prediction: predictionLower,
      totalAmount: betAmount,
      feeAmount: 0,
      stakeAmount: betAmount,
      result: 'pending',
      isBot: false
    }, { transaction });

    // ✅ Lock the bet amount
    const newLockedBalance = roundToTwo(currentLockedBalance + betAmount);

    await wallet.update({
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
        amount: betAmount
      },
      balanceBefore: balanceBefore,
      balanceAfter: walletBalance
    }, { transaction });

    // ===== UPDATE ROUND TOTALS =====
    if (predictionLower === 'up') {
      await round.update({
        totalUpAmount: roundToTwo(parseFloat(round.totalUpAmount || 0) + betAmount),
        totalUpBets: (round.totalUpBets || 0) + 1
      }, { transaction });
    } else {
      await round.update({
        totalDownAmount: roundToTwo(parseFloat(round.totalDownAmount || 0) + betAmount),
        totalDownBets: (round.totalDownBets || 0) + 1
      }, { transaction });
    }

    // Get updated totals
    const newTotalUpAmount = predictionLower === 'up' 
      ? roundToTwo(parseFloat(round.totalUpAmount || 0) + betAmount)
      : parseFloat(round.totalUpAmount || 0);
    const newTotalDownAmount = predictionLower === 'down' 
      ? roundToTwo(parseFloat(round.totalDownAmount || 0) + betAmount)
      : parseFloat(round.totalDownAmount || 0);

    // Calculate multipliers
    const multipliers = calculateMultipliers(newTotalUpAmount, newTotalDownAmount);
    const currentMultiplier = predictionLower === 'up' ? multipliers.upRaw : multipliers.downRaw;
    const potentialPayout = roundToTwo(betAmount * currentMultiplier);
    const potentialProfit = roundToTwo(potentialPayout - betAmount);

    await transaction.commit();

    // ===== EMIT SOCKET EVENTS =====
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('bet_placed', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          prediction: predictionLower,
          amount: betAmount,
          totalUpAmount: newTotalUpAmount,
          totalDownAmount: newTotalDownAmount,
          totalUpBets: predictionLower === 'up' ? (round.totalUpBets || 0) + 1 : (round.totalUpBets || 0),
          totalDownBets: predictionLower === 'down' ? (round.totalDownBets || 0) + 1 : (round.totalDownBets || 0),
          upMultiplier: multipliers.upDisplay,
          downMultiplier: multipliers.downDisplay,
          upMultiplierRaw: multipliers.upRaw,
          downMultiplierRaw: multipliers.downRaw
        });

        io.to(req.user.id).emit('balance_update', {
          nairaBalance: walletBalance,
          lockedBalance: newLockedBalance,
          availableBalance: roundToTwo(walletBalance - newLockedBalance)
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
        amount: betAmount,
        currentMultiplier: `${currentMultiplier}x`,
        currentMultiplierRaw: currentMultiplier,
        potentialPayout: potentialPayout,
        potentialProfit: potentialProfit
      },
      wallet: {
        totalBalance: walletBalance,
        lockedBalance: newLockedBalance,
        availableBalance: roundToTwo(walletBalance - newLockedBalance)
      },
      poolInfo: {
        totalUpAmount: newTotalUpAmount,
        totalDownAmount: newTotalDownAmount,
        upMultiplier: multipliers.upDisplay,
        downMultiplier: multipliers.downDisplay
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Place bet error:', error.message);
    console.error('Stack:', error.stack);
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
        result: 'pending',
        isBot: false
      },
      include: [{
        model: Round,
        as: 'round',
        where: {
          status: { [Op.in]: ['active', 'locked'] }
        },
        required: true
      }],
      order: [['createdAt', 'DESC']]
    });

    const currentPrice = priceService.getPrice();
    const now = new Date();

    const activeBets = await Promise.all(bets.map(async (bet) => {
      const round = bet.round;
      
      if (!round) return null;

      // Get all bets for this round
      const roundBets = await Bet.findAll({
        where: { roundId: round.id },
        attributes: ['prediction', 'stakeAmount']
      });

      const totalUpAmount = roundBets
        .filter(b => b.prediction === 'up')
        .reduce((sum, b) => sum + parseFloat(b.stakeAmount), 0);
      const totalDownAmount = roundBets
        .filter(b => b.prediction === 'down')
        .reduce((sum, b) => sum + parseFloat(b.stakeAmount), 0);

      const multipliers = calculateMultipliers(totalUpAmount, totalDownAmount);

      const userMultiplier = bet.prediction === 'up' ? multipliers.upRaw : multipliers.downRaw;
      const userMultiplierDisplay = bet.prediction === 'up' ? multipliers.upDisplay : multipliers.downDisplay;

      const betAmount = parseFloat(bet.stakeAmount);
      const potentialPayout = roundToTwo(betAmount * userMultiplier);
      const potentialProfit = roundToTwo(potentialPayout - betAmount);

      const startPrice = parseFloat(round.startPrice);
      const priceChange = currentPrice - startPrice;
      const isWinning = (bet.prediction === 'up' && priceChange > 0) || 
                        (bet.prediction === 'down' && priceChange < 0);

      const bettingEndsIn = Math.max(0, Math.floor((new Date(round.lockTime) - now) / 1000));
      const roundEndsIn = Math.max(0, Math.floor((new Date(round.endTime) - now) / 1000));

      return {
        id: bet.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        prediction: bet.prediction,
        amount: parseFloat(bet.totalAmount || bet.stakeAmount),
        stakeAmount: betAmount,
        currentMultiplier: userMultiplierDisplay,
        currentMultiplierRaw: userMultiplier,
        potentialPayout: potentialPayout,
        potentialProfit: potentialProfit,
        roundStatus: round.status,
        startPrice: startPrice,
        currentPrice: currentPrice,
        priceChange: roundToTwo(priceChange),
        percentChange: roundToTwo((priceChange / startPrice) * 100),
        isCurrentlyWinning: isWinning,
        totalUpAmount: roundToTwo(totalUpAmount),
        totalDownAmount: roundToTwo(totalDownAmount),
        upMultiplier: multipliers.upDisplay,
        downMultiplier: multipliers.downDisplay,
        bettingEndsIn,
        roundEndsIn,
        lockTime: round.lockTime,
        endTime: round.endTime,
        createdAt: bet.createdAt
      };
    }));

    const validBets = activeBets.filter(bet => bet !== null);

    const totals = {
      totalBets: validBets.length,
      totalStaked: roundToTwo(validBets.reduce((sum, b) => sum + b.stakeAmount, 0)),
      totalPotentialPayout: roundToTwo(validBets.reduce((sum, b) => sum + b.potentialPayout, 0)),
      totalPotentialProfit: roundToTwo(validBets.reduce((sum, b) => sum + b.potentialProfit, 0))
    };

    res.json({
      success: true,
      activeBets: validBets,
      totals,
      currentPrice
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
      result: { [Op.ne]: 'pending' },
      isBot: false
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

    const stats = await Bet.findAll({
      where: {
        userId: req.user.id,
        result: { [Op.ne]: 'pending' },
        isBot: false
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBets'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'win' THEN 1 ELSE 0 END")), 'wins'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'loss' THEN 1 ELSE 0 END")), 'losses'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'refund' THEN 1 ELSE 0 END")), 'refunds'],
        [sequelize.fn('SUM', sequelize.col('stakeAmount')), 'totalWagered'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayout'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'netProfit']
      ],
      raw: true
    });

    const statistics = stats[0] || {};
    const totalBetsCount = parseInt(statistics.totalBets) || 0;
    const winsCount = parseInt(statistics.wins) || 0;

    res.json({
      success: true,
      bets: bets.map(bet => ({
        ...bet.toJSON(),
        totalAmount: parseFloat(bet.totalAmount || bet.stakeAmount),
        stakeAmount: parseFloat(bet.stakeAmount),
        payout: parseFloat(bet.payout) || 0,
        profit: parseFloat(bet.profit) || 0
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        hasMore: parseInt(page) < Math.ceil(count / parseInt(limit))
      },
      statistics: {
        totalBets: totalBetsCount,
        wins: winsCount,
        losses: parseInt(statistics.losses) || 0,
        refunds: parseInt(statistics.refunds) || 0,
        winRate: totalBetsCount > 0 
          ? roundToTwo((winsCount / totalBetsCount) * 100) 
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
// @desc    Get round history
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
        'prizePool', 'platformFee'
      ],
      order: [['roundNumber', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

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
        where: { isBot: false },
        required: false,
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

    const bets = round.bets || [];
    const stats = {
      totalBets: bets.length,
      upBets: bets.filter(b => b.prediction === 'up').length,
      downBets: bets.filter(b => b.prediction === 'down').length,
      winners: bets.filter(b => b.result === 'win').length,
      losers: bets.filter(b => b.result === 'loss').length,
      refunds: bets.filter(b => b.result === 'refund').length,
      totalUpAmount: roundToTwo(bets.filter(b => b.prediction === 'up').reduce((sum, b) => sum + parseFloat(b.stakeAmount), 0)),
      totalDownAmount: roundToTwo(bets.filter(b => b.prediction === 'down').reduce((sum, b) => sum + parseFloat(b.stakeAmount), 0))
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
    const totalBets = await Bet.count({ where: { isBot: false } });
    const activeBets = await Bet.count({ where: { result: 'pending', isBot: false } });

    const volumeStats = await Bet.findAll({
      where: { isBot: false },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('stakeAmount')), 'totalVolume'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayouts']
      ],
      raw: true
    });

    const uniqueUsers = await Bet.findAll({
      where: { isBot: false },
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

    const totalWinningBets = await Bet.count({
      where: { result: 'win', isBot: false, ...timeFilter }
    });

    if (totalWinningBets === 0) {
      return res.json({
        success: true,
        period,
        leaderboard: []
      });
    }

    const leaderboard = await Bet.findAll({
      where: { result: 'win', isBot: false, ...timeFilter },
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
        [sequelize.fn('SUM', sequelize.col('payout')), 'totalPayout'],
        [sequelize.fn('COUNT', sequelize.col('Bet.id')), 'totalWins']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
        required: true
      }],
      group: ['userId', 'user.id'],
      having: sequelize.where(sequelize.fn('SUM', sequelize.col('profit')), { [Op.gt]: 0 }),
      order: [[sequelize.fn('SUM', sequelize.col('profit')), 'DESC']],
      limit: parseInt(limit),
      subQuery: false,
      raw: true
    });

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry['user.username'] || 'Anonymous',
      userId: entry.userId,
      totalProfit: roundToTwo(parseFloat(entry.totalProfit) || 0),
      totalPayout: roundToTwo(parseFloat(entry.totalPayout) || 0),
      totalWins: parseInt(entry.totalWins) || 0
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
  getActiveRound,
  getLockedRound,
  getUpcomingRound,
  getPreviousRounds,
  getRoundChart,
  placeBet,
  getMyActiveBets,
  getMyBetHistory,
  getRoundHistory,
  getRoundDetails,
  getPlatformStats,
  getLeaderboard
};
