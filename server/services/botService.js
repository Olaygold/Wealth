
// server/services/botService.js
const { Bet, Round } = require('../models');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    
    // ====== BET COUNT CONFIG ======
    this.minBetsPerRound = parseInt(process.env.BOT_MIN_BETS) || 5;
    this.maxBetsPerRound = parseInt(process.env.BOT_MAX_BETS) || 17;
    
    // ====== AMOUNT CONFIG ======
    this.minBetAmount = parseInt(process.env.BOT_MIN_AMOUNT) || 300;
    this.maxBetAmount = parseInt(process.env.BOT_MAX_AMOUNT) || 800;
    
    // ====== BALANCE CONFIG ======
    this.upDownBalance = parseFloat(process.env.BOT_BALANCE_THRESHOLD) || 0.15;
    
    // ====== YOUR 2 BOT USER IDs ======
    this.botUser1Id = process.env.BOT_USER_1_ID;
    this.botUser2Id = process.env.BOT_USER_2_ID;
    
    // ====== ROUND TRACKING ======
    this.roundBotStatus = new Map();
    
    console.log('🤖 Bot Service initialized');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Bot 1 ID: ${this.botUser1Id}`);
    console.log(`   Bot 2 ID: ${this.botUser2Id}`);
    console.log(`   Bets per round: ${this.minBetsPerRound}-${this.maxBetsPerRound}`);
    console.log(`   Bet amounts: ₦${this.minBetAmount}-₦${this.maxBetAmount}`);
    console.log(`   Max UP/DOWN difference: ${this.upDownBalance * 100}%`);
  }

  // ==================== HELPER FUNCTIONS ====================

  getRandomAmount() {
    const amount = Math.floor(
      Math.random() * (this.maxBetAmount - this.minBetAmount + 1)
    ) + this.minBetAmount;
    return Math.max(100, Math.round(amount / 50) * 50);
  }

  getRandomBetCount() {
    return Math.floor(
      Math.random() * (this.maxBetsPerRound - this.minBetsPerRound + 1)
    ) + this.minBetsPerRound;
  }

  getBotUserIdForIndex(index) {
    return index % 2 === 0 ? this.botUser1Id : this.botUser2Id;
  }

  // ==================== GENERATE BET PLAN ====================

  generateBetPlan(totalBets) {
    const bets = [];
    let upTotal = 0;
    let downTotal = 0;

    for (let i = 0; i < totalBets; i++) {
      const amount = this.getRandomAmount();
      let prediction;

      if (i === 0) {
        prediction = Math.random() > 0.5 ? 'up' : 'down';
      } else {
        const largerSide = Math.max(upTotal, downTotal);
        const difference = largerSide > 0
          ? Math.abs(upTotal - downTotal) / largerSide
          : 0;

        if (difference > this.upDownBalance) {
          prediction = upTotal < downTotal ? 'up' : 'down';
          console.log(
            `⚖️  Forcing balance at bet #${i + 1}: ` +
            `gap=${Math.abs(upTotal - downTotal).toFixed(0)} ` +
            `diff=${(difference * 100).toFixed(1)}% > ` +
            `threshold=${this.upDownBalance * 100}% → ${prediction.toUpperCase()}`
          );
        } else {
          if (upTotal < downTotal) {
            prediction = Math.random() > 0.35 ? 'up' : 'down';
          } else if (downTotal < upTotal) {
            prediction = Math.random() > 0.65 ? 'up' : 'down';
          } else {
            prediction = Math.random() > 0.5 ? 'up' : 'down';
          }
        }
      }

      if (prediction === 'up') {
        upTotal += amount;
      } else {
        downTotal += amount;
      }

      const botUserId = this.getBotUserIdForIndex(i);
      const botName = i % 2 === 0 ? 'AutoTrader_1' : 'AutoTrader_2';

      const maxSpreadSeconds = 270;
      const baseDelay = (maxSpreadSeconds / totalBets) * i;
      const randomVariation = (Math.random() - 0.5) * 20;
      const delay = Math.max(0, Math.floor(baseDelay + randomVariation));

      bets.push({
        prediction,
        amount,
        delay,
        botUserId,
        botName,
        placed: false
      });
    }

    const upBets = bets.filter(b => b.prediction === 'up');
    const downBets = bets.filter(b => b.prediction === 'down');

    const largerSide = Math.max(upTotal, downTotal);
    const balanceDiff = largerSide > 0
      ? (Math.abs(upTotal - downTotal) / largerSide) * 100
      : 0;

    console.log('📊 Bot Plan Generated:');
    console.log(`   Total Bets : ${totalBets}`);
    console.log(`   UP         : ${upBets.length} bets = ₦${upTotal.toLocaleString()}`);
    console.log(`   DOWN       : ${downBets.length} bets = ₦${downTotal.toLocaleString()}`);
    console.log(`   Gap        : ₦${Math.abs(upTotal - downTotal).toLocaleString()}`);
    console.log(`   Imbalance  : ${balanceDiff.toFixed(1)}% (vs larger side)`);
    console.log(`   Threshold  : ${this.upDownBalance * 100}%`);
    console.log(`   Spread     : 0 - 270 seconds (4.5 min safe window)`);

    return bets;
  }

  // ==================== MAIN CHECK FUNCTION ====================

  async checkAndPlaceBets(round, io) {
    if (!this.isEnabled) return;
    if (!round || round.status !== 'active') return;

    if (!this.botUser1Id || !this.botUser2Id) {
      console.error('❌ Bot user IDs not configured in .env');
      return;
    }

    const roundId = round.id;
    const now = new Date();

    if (!this.roundBotStatus.has(roundId)) {
      const betCount = this.getRandomBetCount();
      const betPlan = this.generateBetPlan(betCount);

      this.roundBotStatus.set(roundId, {
        startTime: now,
        betPlan: betPlan,
        totalBets: betCount,
        placedCount: 0
      });

      console.log(`🤖 Round #${round.roundNumber} - Bot plan: ${betCount} bets`);
    }

    const status = this.roundBotStatus.get(roundId);
    const elapsedSeconds = (now - status.startTime) / 1000;

    for (let i = 0; i < status.betPlan.length; i++) {
      const bet = status.betPlan[i];

      if (bet.placed) continue;

      if (elapsedSeconds >= bet.delay) {
        const success = await this.placeBotBet(
          round,
          bet.botUserId,
          bet.prediction,
          bet.amount,
          io,
          bet.botName,
          i + 1,
          status.totalBets
        );

        if (success) {
          status.betPlan[i].placed = true;
          status.placedCount++;
          this.roundBotStatus.set(roundId, status);
        }
      }
    }
  }

  // ==================== PLACE BOT BET ====================

  async placeBotBet(round, botUserId, prediction, amount, io, botName, betNumber, totalBets) {
    try {
      const botBetsInRound = await Bet.count({
        where: {
          roundId: round.id,
          userId: botUserId
        }
      });

      const maxBetsPerBot = Math.ceil(totalBets / 2);
      
      if (botBetsInRound >= maxBetsPerBot) {
        console.log(`🤖 ${botName} reached max bets (${maxBetsPerBot}) for round #${round.roundNumber}`);
        return false;
      }

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

      if (prediction === 'up') {
        await round.increment('totalUpAmount', { by: amount });
        await round.increment('totalUpBets', { by: 1 });
      } else {
        await round.increment('totalDownAmount', { by: amount });
        await round.increment('totalDownBets', { by: 1 });
      }

      await round.reload();

      const totalUp = parseFloat(round.totalUpAmount || 0);
      const totalDown = parseFloat(round.totalDownAmount || 0);

      let upMultiplier = 1.7;
      let downMultiplier = 1.7;

      if (totalUp > 0 && totalDown > 0) {
        upMultiplier = parseFloat((1 + (totalDown * 0.7) / totalUp).toFixed(2));
        downMultiplier = parseFloat((1 + (totalUp * 0.7) / totalDown).toFixed(2));
      }

      if (io) {
        io.emit('bet_placed', {
          roundId: round.id,
          prediction: prediction,
          amount: amount,
          totalUpAmount: totalUp,
          totalDownAmount: totalDown,
          totalUpBets: round.totalUpBets || 0,
          totalDownBets: round.totalDownBets || 0,
          upMultiplier: upMultiplier,
          downMultiplier: downMultiplier,
          isBot: true
        });
      }

      console.log(
        `🤖 ${botName} bet #${betNumber}/${totalBets}: ` +
        `${prediction.toUpperCase()} ₦${amount.toLocaleString()} ` +
        `(Round #${round.roundNumber})`
      );
      console.log(
        `   Pool: UP ₦${totalUp.toLocaleString()} (${round.totalUpBets} bets) | ` +
        `DOWN ₦${totalDown.toLocaleString()} (${round.totalDownBets} bets)`
      );

      return true;

    } catch (error) {
      console.error(`❌ ${botName} bet error:`, error.message);
      return false;
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  cleanupRound(roundId) {
    if (this.roundBotStatus.has(roundId)) {
      const status = this.roundBotStatus.get(roundId);
      console.log(
        `🧹 Round ${roundId} cleanup: ` +
        `${status.placedCount}/${status.totalBets} bets placed`
      );
      this.roundBotStatus.delete(roundId);
    }
  }

  async getBotStats() {
    try {
      const totalBotBets = await Bet.count({
        where: { isBot: true }
      });

      const upBets = await Bet.count({
        where: { isBot: true, prediction: 'up' }
      });

      const downBets = await Bet.count({
        where: { isBot: true, prediction: 'down' }
      });

      const totalStaked = await Bet.sum('stakeAmount', {
        where: { isBot: true }
      }) || 0;

      const totalWinnings = await Bet.sum('payout', {
        where: { isBot: true, result: 'win' }
      }) || 0;

      const totalLost = await Bet.sum('stakeAmount', {
        where: { isBot: true, result: 'loss' }
      }) || 0;

      return {
        enabled: this.isEnabled,
        config: {
          betsPerRound: `${this.minBetsPerRound}-${this.maxBetsPerRound}`,
          amountRange: `₦${this.minBetAmount}-₦${this.maxBetAmount}`,
          balanceThreshold: `${this.upDownBalance * 100}%`,
          bot1Id: this.botUser1Id,
          bot2Id: this.botUser2Id
        },
        stats: {
          totalBets: totalBotBets,
          upBets: upBets,
          downBets: downBets,
          totalStaked: totalStaked,
          totalWinnings: totalWinnings,
          totalLost: totalLost,
          netProfit: totalWinnings - totalLost
        }
      };

    } catch (error) {
      console.error('❌ Error getting bot stats:', error.message);
      return { enabled: this.isEnabled, error: error.message };
    }
  }

  // ==================== ADMIN CONTROLS ====================

  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🤖 Bot ${enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    return this.isEnabled;
  }

  setBetRange(min, max) {
    this.minBetsPerRound = parseInt(min);
    this.maxBetsPerRound = parseInt(max);
    console.log(`🤖 Bet range: ${min}-${max} per round`);
    return { min: this.minBetsPerRound, max: this.maxBetsPerRound };
  }

  setAmountRange(min, max) {
    this.minBetAmount = parseInt(min);
    this.maxBetAmount = parseInt(max);
    console.log(`🤖 Amount range: ₦${min}-₦${max}`);
    return { min: this.minBetAmount, max: this.maxBetAmount };
  }

  setBalanceThreshold(threshold) {
    this.upDownBalance = parseFloat(threshold);
    console.log(`🤖 Balance threshold: ${threshold * 100}%`);
    return this.upDownBalance;
  }
}

const botService = new BotService();
module.exports = botService;
