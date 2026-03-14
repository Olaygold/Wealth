
// server/services/botService.js
const { Bet, Round } = require('../models');

class BotService {
  constructor() {
    this.isEnabled = process.env.BOT_ENABLED === 'true';
    
    // ====== BET COUNT CONFIG ======
    // FIXED: Exactly 2 bets per round (1 UP, 1 DOWN)
    this.botsPerRound = 2;
    
    // ====== AMOUNT CONFIG ======
    // FIXED: Max ₦350 per bet
    this.minBetAmount = parseInt(process.env.BOT_MIN_AMOUNT) || 100;
    this.maxBetAmount = 350; // STRICT MAX
    
    // ====== BALANCE CONFIG ======
    // FIXED: Max ₦100 difference between UP and DOWN
    this.maxBotDifference = 100;
    
    // ====== YOUR 2 BOT USER IDs ======
    this.botUser1Id = process.env.BOT_USER_1_ID;
    this.botUser2Id = process.env.BOT_USER_2_ID;
    
    // ====== ROUND TRACKING ======
    this.roundBotStatus = new Map();
    
    console.log('🤖 Bot Service initialized (SIMPLE MODE)');
    console.log(`   Enabled: ${this.isEnabled}`);
    console.log(`   Bot 1 ID: ${this.botUser1Id}`);
    console.log(`   Bot 2 ID: ${this.botUser2Id}`);
    console.log(`   Bets per round: ${this.botsPerRound} (1 UP, 1 DOWN)`);
    console.log(`   Max bet amount: ₦${this.maxBetAmount}`);
    console.log(`   Max difference: ₦${this.maxBotDifference}`);
  }

  // ==================== HELPER FUNCTIONS ====================

  getRandomAmount() {
    // Random between min and 350, rounded to nearest 50
    const amount = Math.floor(
      Math.random() * (this.maxBetAmount - this.minBetAmount + 1)
    ) + this.minBetAmount;
    return Math.max(50, Math.round(amount / 50) * 50);
  }

  // ==================== SIMPLE 2-BOT PLAN ====================
  
  generateSimpleBotPlan() {
    const bets = [];
    
    // Bot 1 always UP
    const bot1Amount = this.getRandomAmount();
    const maxSpreadSeconds = 270;
    
    bets.push({
      prediction: 'up',
      amount: bot1Amount,
      delay: Math.floor(Math.random() * 30), // First bet within 30 seconds
      botUserId: this.botUser1Id,
      botName: 'AutoTrader_1',
      placed: false
    });

    // Bot 2 always DOWN
    // Calculate max allowed to keep difference under ₦100
    const maxAllowedForBot2 = Math.min(
      this.maxBetAmount,
      bot1Amount + this.maxBotDifference
    );
    
    // Generate amount that won't exceed difference limit
    let bot2Amount = this.getRandomAmount();
    bot2Amount = Math.min(bot2Amount, maxAllowedForBot2);
    bot2Amount = Math.max(50, Math.round(bot2Amount / 50) * 50);

    bets.push({
      prediction: 'down',
      amount: bot2Amount,
      delay: Math.floor(30 + Math.random() * 60), // Second bet 30-90 seconds after first
      botUserId: this.botUser2Id,
      botName: 'AutoTrader_2',
      placed: false
    });

    // Sort by delay
    bets.sort((a, b) => a.delay - b.delay);

    const botUpTotal = bets[0].amount;
    const botDownTotal = bets[1].amount;
    const finalDiff = Math.abs(botUpTotal - botDownTotal);

    console.log('');
    console.log('📊 ======= BOT PLAN (2 BOTS ONLY) =======');
    console.log(`   Bot 1 (UP)   : ₦${botUpTotal.toLocaleString()}`);
    console.log(`   Bot 2 (DOWN) : ₦${botDownTotal.toLocaleString()}`);
    console.log(`   Difference   : ₦${finalDiff} / ₦${this.maxBotDifference}`);
    console.log(`   Status       : ${finalDiff <= this.maxBotDifference ? '✅ VALID' : '❌ INVALID'}`);
    console.log('==========================================');
    console.log('');

    return {
      bets,
      botUpTotal,
      botDownTotal,
      finalDiff
    };
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

    // Initialize plan for this round (only once)
    if (!this.roundBotStatus.has(roundId)) {
      const plan = this.generateSimpleBotPlan();

      this.roundBotStatus.set(roundId, {
        startTime: now,
        bets: plan.bets,
        totalBets: this.botsPerRound,
        placedCount: 0,
        botUpTotal: 0,
        botDownTotal: 0,
        plannedUpTotal: plan.botUpTotal,
        plannedDownTotal: plan.botDownTotal
      });

      console.log(`🤖 Round #${round.roundNumber} - Simple plan: 1 UP, 1 DOWN | Diff: ₦${plan.finalDiff}`);
    }

    const status = this.roundBotStatus.get(roundId);
    const elapsedSeconds = (now - status.startTime) / 1000;

    // Place bets according to timing
    for (let i = 0; i < status.bets.length; i++) {
      const bet = status.bets[i];

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
          status.bets[i].placed = true;
          status.placedCount++;
          
          // Track bot's actual placed totals
          if (bet.prediction === 'up') {
            status.botUpTotal += bet.amount;
          } else {
            status.botDownTotal += bet.amount;
          }
          
          this.roundBotStatus.set(roundId, status);

          // Log actual bot balance
          const actualDiff = Math.abs(status.botUpTotal - status.botDownTotal);
          const isWithinLimit = actualDiff <= this.maxBotDifference;
          
          console.log(
            `   📈 BOT TOTALS: UP ₦${status.botUpTotal} | DOWN ₦${status.botDownTotal} | ` +
            `Diff: ₦${actualDiff}/${this.maxBotDifference} ${isWithinLimit ? '✅' : '❌ OVER!'}`
          );
        }
      }
    }
  }

  // ==================== PLACE BOT BET ====================

  async placeBotBet(round, botUserId, prediction, amount, io, botName, betNumber, totalBets) {
    try {
      // Check if this bot already placed a bet this round
      const botBetsInRound = await Bet.count({
        where: { roundId: round.id, userId: botUserId }
      });

      if (botBetsInRound >= 1) {
        console.log(`🤖 ${botName} already placed bet this round`);
        return false;
      }

      // Create bet
      await Bet.create({
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
        `🤖 ${botName}: ${prediction.toUpperCase()} ₦${amount} (Round #${round.roundNumber})`
      );

      return true;

    } catch (error) {
      console.error(`❌ ${botName} bet error:`, error.message);
      return false;
    }
  }

  // ==================== CLEANUP ====================

  cleanupRound(roundId) {
    if (this.roundBotStatus.has(roundId)) {
      const status = this.roundBotStatus.get(roundId);
      const actualDiff = Math.abs(status.botUpTotal - status.botDownTotal);
      const isValid = actualDiff <= this.maxBotDifference;
      
      console.log(
        `🧹 Round ${roundId}: ${status.placedCount}/2 bets | ` +
        `UP ₦${status.botUpTotal} DOWN ₦${status.botDownTotal} | ` +
        `Diff ₦${actualDiff}/${this.maxBotDifference} ${isValid ? '✅' : '❌'}`
      );
      
      this.roundBotStatus.delete(roundId);
    }
  }

  async getBotStats() {
    try {
      const totalBotBets = await Bet.count({ where: { isBot: true } });
      const upBets = await Bet.count({ where: { isBot: true, prediction: 'up' } });
      const downBets = await Bet.count({ where: { isBot: true, prediction: 'down' } });
      const totalStaked = await Bet.sum('stakeAmount', { where: { isBot: true } }) || 0;
      const totalWinnings = await Bet.sum('payout', { where: { isBot: true, result: 'win' } }) || 0;
      const totalLost = await Bet.sum('stakeAmount', { where: { isBot: true, result: 'loss' } }) || 0;

      return {
        enabled: this.isEnabled,
        config: {
          botsPerRound: '2 (1 UP, 1 DOWN)',
          amountRange: `₦${this.minBetAmount}-₦${this.maxBetAmount}`,
          maxBotDifference: `₦${this.maxBotDifference}`,
          bot1Id: this.botUser1Id,
          bot2Id: this.botUser2Id
        },
        stats: {
          totalBets: totalBotBets,
          upBets,
          downBets,
          totalStaked,
          totalWinnings,
          totalLost,
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

  setAmountRange(min, max) {
    // Enforce max 350
    this.minBetAmount = parseInt(min);
    this.maxBetAmount = Math.min(parseInt(max), 350);
    console.log(`🤖 Amount range: ₦${this.minBetAmount}-₦${this.maxBetAmount}`);
    return { min: this.minBetAmount, max: this.maxBetAmount };
  }

  setMaxDifference(maxDiff) {
    // Enforce max 100
    this.maxBotDifference = Math.min(parseInt(maxDiff), 100);
    console.log(`🤖 Max bot difference: ₦${this.maxBotDifference}`);
    return this.maxBotDifference;
  }
}

const botService = new BotService();
module.exports = botService;
