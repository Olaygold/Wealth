
// server/services/botService.js
const { Bet, Round } = require('../models');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    this.baseBotAmount = parseFloat(process.env.BOT_AMOUNT) || 500;
    this.amountVariation = parseFloat(process.env.BOT_AMOUNT_VARIATION) || 200; // ±200
    
    this.firstBetMinuteRemaining = parseFloat(process.env.BOT_FIRST_BET_MINUTE) || 8;
    this.secondBetMinuteRemaining = parseFloat(process.env.BOT_SECOND_BET_MINUTE) || 7;
    
    this.firstBetDelay = parseFloat(process.env.BOT_FIRST_DELAY_SECONDS) || 60;  // 1 min gap before first bet
    this.secondBetDelay = parseFloat(process.env.BOT_SECOND_DELAY_SECONDS) || 30; // 30 sec gap after first bet
    
    this.botUser1Id = process.env.BOT_USER_1_ID;
    this.botUser2Id = process.env.BOT_USER_2_ID;
    
    this.roundBotStatus = new Map();
    
    console.log('🤖 Bot Service initialized');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Base Amount: ₦${this.baseBotAmount} (±₦${this.amountVariation})`);
    console.log(`   Bot 1: ${this.botUser1Id}`);
    console.log(`   Bot 2: ${this.botUser2Id}`);
    console.log(`   First bet trigger: ${this.firstBetMinuteRemaining} min remaining`);
    console.log(`   Second bet trigger: ${this.secondBetMinuteRemaining} min remaining`);
    console.log(`   First bet delay: ${this.firstBetDelay} seconds`);
    console.log(`   Second bet delay: ${this.secondBetDelay} seconds after first`);
  }

  // ✅ Generate random amount between (base - variation) and (base + variation)
  getRandomAmount() {
    const min = this.baseBotAmount - this.amountVariation;
    const max = this.baseBotAmount + this.amountVariation;
    
    // Round to nearest 50 (looks more natural: 350, 400, 450, 500, 550, 600, 650, 700)
    const randomAmount = Math.floor(Math.random() * (max - min + 1)) + min;
    const roundedAmount = Math.round(randomAmount / 50) * 50;
    
    // Ensure minimum 100
    return Math.max(100, roundedAmount);
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
    
    // Initialize tracking for this round
    if (!this.roundBotStatus.has(roundId)) {
      this.roundBotStatus.set(roundId, {
        firstBetTriggered: false,
        firstBetPlaced: false,
        secondBetPlaced: false,
        firstBetSide: null,
        firstBetTime: null,
        triggerTime: null,
        bot1Amount: this.getRandomAmount(),  // ✅ Pre-generate random amounts
        bot2Amount: this.getRandomAmount()
      });
    }

    const status = this.roundBotStatus.get(roundId);

    // ✅ BOT 1 - Mark trigger time when condition is met
    if (minutesRemaining <= this.firstBetMinuteRemaining && !status.firstBetTriggered) {
      status.firstBetTriggered = true;
      status.triggerTime = new Date();
      this.roundBotStatus.set(roundId, status);
      console.log(`🤖 Bot 1 triggered - will bet in ${this.firstBetDelay}s (Round #${round.roundNumber})`);
    }

    // ✅ BOT 1 - Place bet after delay
    if (status.firstBetTriggered && !status.firstBetPlaced) {
      const timeSinceTrigger = (now - status.triggerTime) / 1000; // seconds
      
      if (timeSinceTrigger >= this.firstBetDelay) {
        const firstSide = Math.random() > 0.5 ? 'up' : 'down';
        await this.placeBotBet(round, this.botUser1Id, firstSide, status.bot1Amount, io, 'AutoTrader_1');
        status.firstBetPlaced = true;
        status.firstBetSide = firstSide;
        status.firstBetTime = new Date();
        this.roundBotStatus.set(roundId, status);
      }
    }

    // ✅ BOT 2 - Place bet after second delay
    if (status.firstBetPlaced && !status.secondBetPlaced) {
      const timeSinceFirstBet = (now - status.firstBetTime) / 1000; // seconds
      
      // Check both time and minute remaining conditions
      if (timeSinceFirstBet >= this.secondBetDelay && minutesRemaining <= this.secondBetMinuteRemaining) {
        const secondSide = status.firstBetSide === 'up' ? 'down' : 'up';
        await this.placeBotBet(round, this.botUser2Id, secondSide, status.bot2Amount, io, 'AutoTrader_2');
        status.secondBetPlaced = true;
        this.roundBotStatus.set(roundId, status);
      }
    }
  }

  async placeBotBet(round, botUserId, prediction, amount, io, botName) {
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

      // Create the bet
      const bet = await Bet.create({
        userId: botUserId,
        roundId: round.id,
        prediction: prediction,
        totalAmount: amount,
        feeAmount: 0,
        stakeAmount: amount,
        result: 'pending',
        isBot: true,
        createdAt: new Date()
      });

      // Update round totals
      if (prediction === 'up') {
        await round.increment('totalUpAmount', { by: amount });
        await round.increment('totalUpBets', { by: 1 });
      } else {
        await round.increment('totalDownAmount', { by: amount });
        await round.increment('totalDownBets', { by: 1 });
      }

      // Refresh round data
      await round.reload();

      // Emit to frontend
      if (io) {
        io.emit('new_bet', {
          roundId: round.id,
          prediction: prediction,
          amount: amount,
          totalUpAmount: parseFloat(round.totalUpAmount || 0),
          totalDownAmount: parseFloat(round.totalDownAmount || 0),
          totalUpBets: round.totalUpBets || 0,
          totalDownBets: round.totalDownBets || 0,
          isBot: true
        });
      }

      console.log(`🤖 ${botName} bet: ${prediction.toUpperCase()} ₦${amount.toLocaleString()} (Round #${round.roundNumber})`);
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

      const totalStaked = await Bet.sum('stakeAmount', {
        where: { isBot: true }
      }) || 0;

      return {
        enabled: this.isEnabled,
        baseBetAmount: this.baseBotAmount,
        amountVariation: this.amountVariation,
        totalBets: totalBotBets,
        totalStaked: totalStaked,
        totalWinnings: totalWinnings,
        totalLost: totalLost,
        netProfit: totalWinnings - totalLost
      };

    } catch (error) {
      console.error('❌ Error getting bot stats:', error.message);
      return {
        enabled: this.isEnabled,
        baseBetAmount: this.baseBotAmount,
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
    this.baseBotAmount = parseFloat(amount);
    console.log(`🤖 Bot base amount set to ₦${this.baseBotAmount}`);
    return this.baseBotAmount;
  }

  setVariation(variation) {
    this.amountVariation = parseFloat(variation);
    console.log(`🤖 Bot amount variation set to ±₦${this.amountVariation}`);
    return this.amountVariation;
  }
}

const botService = new BotService();
module.exports = botService;
