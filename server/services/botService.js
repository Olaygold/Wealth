
// server/services/botService.js
const { Bet, Round, Wallet, User } = require('../models');
const { Op } = require('sequelize');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    this.botAmount = parseFloat(process.env.BOT_AMOUNT) || 500;
    
    // ✅ NOW THESE ARE "MINUTES REMAINING" NOT "MINUTES ELAPSED"
    this.firstBetMinuteRemaining = parseFloat(process.env.BOT_FIRST_BET_MINUTE) || 8;
    this.secondBetMinuteRemaining = parseFloat(process.env.BOT_SECOND_BET_MINUTE) || 7;
    
    this.botUserId = process.env.BOT_USER_ID || 'BOT_SYSTEM';
    this.roundBotStatus = new Map();
    
    console.log('🤖 Bot Service initialized');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Amount: ₦${this.botAmount}`);
    console.log(`   First bet: ${this.firstBetMinuteRemaining} minutes REMAINING`);
    console.log(`   Second bet: ${this.secondBetMinuteRemaining} minutes REMAINING`);
  }

  // ✅ UPDATED - Now uses countdown logic
  async checkAndPlaceBets(round, io) {
    if (!this.isEnabled) {
      return;
    }

    if (!round || round.status !== 'active') {
      return;
    }

    const now = new Date();
    const lockTime = new Date(round.lockTime);
    
    // ✅ Calculate minutes REMAINING until lock
    const minutesRemaining = (lockTime - now) / (1000 * 60);

    const roundId = round.id;
    
    if (!this.roundBotStatus.has(roundId)) {
      this.roundBotStatus.set(roundId, {
        firstBetPlaced: false,
        secondBetPlaced: false,
        firstBetSide: null
      });
    }

    const status = this.roundBotStatus.get(roundId);

    // ✅ First bet - when X minutes REMAINING
    if (minutesRemaining <= this.firstBetMinuteRemaining && !status.firstBetPlaced) {
      const firstSide = Math.random() > 0.5 ? 'up' : 'down';
      await this.placeBotBet(round, firstSide, io);
      status.firstBetPlaced = true;
      status.firstBetSide = firstSide;
      this.roundBotStatus.set(roundId, status);
      console.log(`🤖 Bot first bet: ${firstSide.toUpperCase()} ₦${this.botAmount} (${minutesRemaining.toFixed(1)} min remaining in Round #${round.roundNumber})`);
    }

    // ✅ Second bet - opposite side, when Y minutes REMAINING
    if (minutesRemaining <= this.secondBetMinuteRemaining && status.firstBetPlaced && !status.secondBetPlaced) {
      const secondSide = status.firstBetSide === 'up' ? 'down' : 'up';
      await this.placeBotBet(round, secondSide, io);
      status.secondBetPlaced = true;
      this.roundBotStatus.set(roundId, status);
      console.log(`🤖 Bot second bet: ${secondSide.toUpperCase()} ₦${this.botAmount} (${minutesRemaining.toFixed(1)} min remaining in Round #${round.roundNumber})`);
    }
  }

  async placeBotBet(round, prediction, io) {
    try {
      const existingBet = await Bet.findOne({
        where: {
          roundId: round.id,
          userId: this.botUserId,
          prediction: prediction
        }
      });

      if (existingBet) {
        console.log(`🤖 Bot already bet ${prediction} for round #${round.roundNumber}`);
        return;
      }

      const bet = await Bet.create({
        userId: this.botUserId,
        roundId: round.id,
        prediction: prediction,
        totalAmount: this.botAmount,
        feeAmount: 0,
        stakeAmount: this.botAmount,
        result: 'pending',
        isBot: true,
        createdAt: new Date()
      });

      if (prediction === 'up') {
        await round.increment('totalUpAmount', { by: this.botAmount });
        await round.increment('totalUpBets', { by: 1 });
      } else {
        await round.increment('totalDownAmount', { by: this.botAmount });
        await round.increment('totalDownBets', { by: 1 });
      }

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

  cleanupRound(roundId) {
    this.roundBotStatus.delete(roundId);
  }

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

  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🤖 Bot ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return this.isEnabled;
  }

  setAmount(amount) {
    this.botAmount = parseFloat(amount);
    console.log(`🤖 Bot amount set to ₦${this.botAmount}`);
    return this.botAmount;
  }
}

const botService = new BotService();
module.exports = botService;
