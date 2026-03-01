// server/services/botService.js
const { Bet, Round, Wallet, User } = require('../models');
const { Op } = require('sequelize');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    this.botAmount = parseFloat(process.env.BOT_AMOUNT) || 500;
    this.firstBetMinute = parseFloat(process.env.BOT_FIRST_BET_MINUTE) || 7;
    this.secondBetMinute = parseFloat(process.env.BOT_SECOND_BET_MINUTE) || 8;
    this.botUserId = process.env.BOT_USER_ID || 'BOT_SYSTEM';
    this.roundBotStatus = new Map(); // Track bot bets per round
    
    console.log('🤖 Bot Service initialized');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Amount: ₦${this.botAmount}`);
    console.log(`   First bet: ${this.firstBetMinute} minutes`);
    console.log(`   Second bet: ${this.secondBetMinute} minutes`);
  }

  // Check if bot should place bets for a round
  async checkAndPlaceBets(round, io) {
    if (!this.isEnabled) {
      return;
    }

    if (!round || round.status !== 'active') {
      return;
    }

    const now = new Date();
    const roundStart = new Date(round.startTime);
    const minutesPassed = (now - roundStart) / (1000 * 60);

    const roundId = round.id;
    
    // Initialize tracking for this round
    if (!this.roundBotStatus.has(roundId)) {
      this.roundBotStatus.set(roundId, {
        firstBetPlaced: false,
        secondBetPlaced: false,
        firstBetSide: null
      });
    }

    const status = this.roundBotStatus.get(roundId);

    // First bet - at configured minute
    if (minutesPassed >= this.firstBetMinute && !status.firstBetPlaced) {
      const firstSide = Math.random() > 0.5 ? 'up' : 'down';
      await this.placeBotBet(round, firstSide, io);
      status.firstBetPlaced = true;
      status.firstBetSide = firstSide;
      this.roundBotStatus.set(roundId, status);
      console.log(`🤖 Bot first bet: ${firstSide.toUpperCase()} ₦${this.botAmount} (Round #${round.roundNumber})`);
    }

    // Second bet - opposite side, at configured minute
    if (minutesPassed >= this.secondBetMinute && status.firstBetPlaced && !status.secondBetPlaced) {
      const secondSide = status.firstBetSide === 'up' ? 'down' : 'up';
      await this.placeBotBet(round, secondSide, io);
      status.secondBetPlaced = true;
      this.roundBotStatus.set(roundId, status);
      console.log(`🤖 Bot second bet: ${secondSide.toUpperCase()} ₦${this.botAmount} (Round #${round.roundNumber})`);
    }
  }

  // Place a bot bet
  async placeBotBet(round, prediction, io) {
    try {
      // Check if bot already bet this side for this round
      const existingBet = await Bet.findOne({
        where: {
          roundId: round.id,
          odUserId: this.botUserId,
          prediction: prediction
        }
      });

      if (existingBet) {
        console.log(`🤖 Bot already bet ${prediction} for round #${round.roundNumber}`);
        return;
      }

      // Create bot bet
      const bet = await Bet.create({
        userId: this.botUserId,
        roundId: round.id,
        prediction: prediction,
        stakeAmount: this.botAmount,
        result: 'pending',
        isBot: true, // ✅ Mark as bot bet
        entryPrice: round.startPrice,
        createdAt: new Date()
      });

      // Update round pools
      if (prediction === 'up') {
        await round.increment('totalUpAmount', { by: this.botAmount });
        await round.increment('totalUpBets', { by: 1 });
      } else {
        await round.increment('totalDownAmount', { by: this.botAmount });
        await round.increment('totalDownBets', { by: 1 });
      }

      // Emit to frontend
      if (io) {
        io.emit('new_bet', {
          roundId: round.id,
          prediction: prediction,
          amount: this.botAmount,
          totalUpAmount: parseFloat(round.totalUpAmount) + (prediction === 'up' ? this.botAmount : 0),
          totalDownAmount: parseFloat(round.totalDownAmount) + (prediction === 'down' ? this.botAmount : 0),
          totalUpBets: round.totalUpBets + (prediction === 'up' ? 1 : 0),
          totalDownBets: round.totalDownBets + (prediction === 'down' ? 1 : 0),
          isBot: true
        });
      }

      console.log(`🤖 Bot bet placed: ${prediction.toUpperCase()} ₦${this.botAmount}`);
      return bet;

    } catch (error) {
      console.error('❌ Bot bet error:', error.message);
    }
  }

  // Clean up old round tracking (call after round ends)
  cleanupRound(roundId) {
    this.roundBotStatus.delete(roundId);
  }

  // Get bot stats for admin
  async getBotStats() {
    try {
      const totalBotBets = await Bet.count({
        where: { isBot: true }
      });

      const botBetsByResult = await Bet.findAll({
        where: { isBot: true },
        attributes: [
          'result',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('stakeAmount')), 'totalAmount']
        ],
        group: ['result'],
        raw: true
      });

      const wins = botBetsByResult.find(r => r.result === 'win') || { count: 0, totalAmount: 0 };
      const losses = botBetsByResult.find(r => r.result === 'loss') || { count: 0, totalAmount: 0 };

      // Calculate profit/loss
      const totalWinnings = await Bet.sum('payout', {
        where: { isBot: true, result: 'win' }
      }) || 0;

      const totalLost = await Bet.sum('stakeAmount', {
        where: { isBot: true, result: 'loss' }
      }) || 0;

      const totalStaked = await Bet.sum('stakeAmount', {
        where: { isBot: true }
      }) || 0;

      return {
        enabled: this.isEnabled,
        betAmount: this.botAmount,
        totalBets: totalBotBets,
        wins: parseInt(wins.count) || 0,
        losses: parseInt(losses.count) || 0,
        totalStaked: totalStaked,
        totalWinnings: totalWinnings,
        totalLost: totalLost,
        netProfit: totalWinnings - totalLost
      };

    } catch (error) {
      console.error('❌ Error getting bot stats:', error.message);
      return {
        enabled: this.isEnabled,
        betAmount: this.botAmount,
        error: error.message
      };
    }
  }

  // Toggle bot on/off
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🤖 Bot ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return this.isEnabled;
  }

  // Update bot amount
  setAmount(amount) {
    this.botAmount = parseFloat(amount);
    console.log(`🤖 Bot amount set to ₦${this.botAmount}`);
    return this.botAmount;
  }
}

const botService = new BotService();
module.exports = botService;
