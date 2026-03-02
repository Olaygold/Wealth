
// server/services/botService.js
const { Bet, Round } = require('../models');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    this.botAmount = parseFloat(process.env.BOT_AMOUNT) || 500;
    this.firstBetMinuteRemaining = parseFloat(process.env.BOT_FIRST_BET_MINUTE) || 8;
    this.secondBetMinuteRemaining = parseFloat(process.env.BOT_SECOND_BET_MINUTE) || 7;
    
    // ✅ TWO separate bot users
    this.botUser1Id = process.env.BOT_USER_1_ID;
    this.botUser2Id = process.env.BOT_USER_2_ID;
    
    this.roundBotStatus = new Map();
    
    console.log('🤖 Bot Service initialized');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Amount: ₦${this.botAmount} per bot`);
    console.log(`   Bot 1: ${this.botUser1Id}`);
    console.log(`   Bot 2: ${this.botUser2Id}`);
    console.log(`   First bet: ${this.firstBetMinuteRemaining} min remaining`);
    console.log(`   Second bet: ${this.secondBetMinuteRemaining} min remaining`);
  }

  async checkAndPlaceBets(round, io) {
    if (!this.isEnabled) {
      return;
    }

    if (!round || round.status !== 'active') {
      return;
    }

    if (!this.botUser1Id || !this.botUser2Id) {
      console.error('❌ Bot user IDs not configured');
      return;
    }

    const now = new Date();
    const lockTime = new Date(round.lockTime);
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

    // ✅ BOT 1 places first bet (random side)
    if (minutesRemaining <= this.firstBetMinuteRemaining && !status.firstBetPlaced) {
      const firstSide = Math.random() > 0.5 ? 'up' : 'down';
      await this.placeBotBet(round, this.botUser1Id, firstSide, io, 'Bot 1');
      status.firstBetPlaced = true;
      status.firstBetSide = firstSide;
      this.roundBotStatus.set(roundId, status);
    }

    // ✅ BOT 2 places second bet (opposite side)
    if (minutesRemaining <= this.secondBetMinuteRemaining && status.firstBetPlaced && !status.secondBetPlaced) {
      const secondSide = status.firstBetSide === 'up' ? 'down' : 'up';
      await this.placeBotBet(round, this.botUser2Id, secondSide, io, 'Bot 2');
      status.secondBetPlaced = true;
      this.roundBotStatus.set(roundId, status);
    }
  }

  async placeBotBet(round, botUserId, prediction, io, botName) {
    try {
      // Check if this bot already bet
      const existingBet = await Bet.findOne({
        where: {
          roundId: round.id,
          userId: botUserId
        }
      });

      if (existingBet) {
        console.log(`🤖 ${botName} already bet for round #${round.roundNumber}`);
        return;
      }

      const bet = await Bet.create({
        userId: botUserId,
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

      console.log(`🤖 ${botName} bet: ${prediction.toUpperCase()} ₦${this.botAmount} (Round #${round.roundNumber})`);
      return bet;

    } catch (error) {
      console.error(`❌ ${botName} error:`, error.message);
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

      const totalWinnings = await Bet.sum('payout', {
        where: { isBot: true, result: 'win' }
      }) || 0;

      const totalLost = await Bet.sum('stakeAmount', {
        where: { isBot: true, result: 'loss' }
      }) || 0;

      return {
        enabled: this.isEnabled,
        betAmount: this.botAmount,
        totalBets: totalBotBets,
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
