

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
    // Max % difference between UP and DOWN (0.15 = 15%)
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

  // Generate random bet amount (rounded to 50)
  getRandomAmount() {
    const amount = Math.floor(
      Math.random() * (this.maxBetAmount - this.minBetAmount + 1)
    ) + this.minBetAmount;
    // Round to nearest 50 - looks natural (300, 350, 400, 450, 500...)
    return Math.max(100, Math.round(amount / 50) * 50);
  }

  // Get random number of bets for this round
  getRandomBetCount() {
    return Math.floor(
      Math.random() * (this.maxBetsPerRound - this.minBetsPerRound + 1)
    ) + this.minBetsPerRound;
  }

  // Alternate bots: even index = bot1, odd index = bot2
  getBotUserIdForIndex(index) {
    return index % 2 === 0 ? this.botUser1Id : this.botUser2Id;
  }

  // ==================== GENERATE BET PLAN - STRICT BALANCING ====================

  generateBetPlan(totalBets) {
    const bets = [];
    let upTotal = 0;
    let downTotal = 0;
    let consecutiveForcedBets = 0;

    for (let i = 0; i < totalBets; i++) {
      const amount = this.getRandomAmount();
      let prediction;

      if (i === 0) {
        // First bet is always random
        prediction = Math.random() > 0.5 ? 'up' : 'down';
        consecutiveForcedBets = 0;
      } else {
        // Calculate CURRENT imbalance using MAX side (not total pool)
        const largerSide = Math.max(upTotal, downTotal);
        const currentDifference = largerSide > 0
          ? Math.abs(upTotal - downTotal) / largerSide
          : 0;

        // Simulate what happens if we bet on each side
        const upTotalIfBetUp = upTotal + amount;
        const downTotalIfBetDown = downTotal + amount;

        const largerIfUp = Math.max(upTotalIfBetUp, downTotal);
        const largerIfDown = Math.max(upTotal, downTotalIfBetDown);

        const differenceIfUp = largerIfUp > 0 
          ? Math.abs(upTotalIfBetUp - downTotal) / largerIfUp 
          : 0;
        const differenceIfDown = largerIfDown > 0 
          ? Math.abs(upTotal - downTotalIfBetDown) / largerIfDown 
          : 0;

        // STRICT BALANCING LOGIC
        if (currentDifference > this.upDownBalance) {
          // Already over threshold - FORCE balance toward weaker side
          prediction = upTotal < downTotal ? 'up' : 'down';
          consecutiveForcedBets++;
          
          console.log(
            `⚖️  FORCED BALANCE #${consecutiveForcedBets} at bet #${i + 1}: ` +
            `UP ₦${upTotal} vs DOWN ₦${downTotal} | ` +
            `Gap ₦${Math.abs(upTotal - downTotal)} | ` +
            `Imbalance ${(currentDifference * 100).toFixed(1)}% > ${this.upDownBalance * 100}% → ${prediction.toUpperCase()}`
          );
        } else if (differenceIfUp > this.upDownBalance && differenceIfDown > this.upDownBalance) {
          // BOTH options would exceed threshold - choose the lesser evil
          prediction = differenceIfUp < differenceIfDown ? 'up' : 'down';
          consecutiveForcedBets++;
          
          console.log(
            `⚠️  Both sides risky at bet #${i + 1}: ` +
            `UP would be ${(differenceIfUp * 100).toFixed(1)}%, ` +
            `DOWN would be ${(differenceIfDown * 100).toFixed(1)}% → ${prediction.toUpperCase()}`
          );
        } else if (differenceIfUp > this.upDownBalance) {
          // Betting UP would break threshold - MUST bet DOWN
          prediction = 'down';
          consecutiveForcedBets++;
          
          console.log(
            `🔒 Prevented imbalance at bet #${i + 1}: ` +
            `UP would reach ${(differenceIfUp * 100).toFixed(1)}% → Forcing DOWN`
          );
        } else if (differenceIfDown > this.upDownBalance) {
          // Betting DOWN would break threshold - MUST bet UP
          prediction = 'up';
          consecutiveForcedBets++;
          
          console.log(
            `🔒 Prevented imbalance at bet #${i + 1}: ` +
            `DOWN would reach ${(differenceIfDown * 100).toFixed(1)}% → Forcing UP`
          );
        } else {
          // Both sides OK - use smart bias toward weaker side
          consecutiveForcedBets = 0;
          
          if (upTotal < downTotal) {
            // UP is weaker - 65% chance to bet UP
            prediction = Math.random() < 0.65 ? 'up' : 'down';
          } else if (downTotal < upTotal) {
            // DOWN is weaker - 65% chance to bet DOWN
            prediction = Math.random() < 0.65 ? 'down' : 'up';
          } else {
            // Perfectly balanced - 50/50
            prediction = Math.random() > 0.5 ? 'up' : 'down';
          }
        }
      }

      // Apply the bet
      if (prediction === 'up') {
        upTotal += amount;
      } else {
        downTotal += amount;
      }

      // Safety warning if still over threshold after this bet
      const finalLargerSide = Math.max(upTotal, downTotal);
      const finalDifference = finalLargerSide > 0 
        ? Math.abs(upTotal - downTotal) / finalLargerSide 
        : 0;
      
      if (finalDifference > this.upDownBalance + 0.05) {
        console.warn(
          `⚠️  WARNING after bet #${i + 1}: ` +
          `Imbalance ${(finalDifference * 100).toFixed(1)}% > threshold ${this.upDownBalance * 100}% | ` +
          `UP ₦${upTotal} DOWN ₦${downTotal}`
        );
      }

      // Assign to bot
      const botUserId = this.getBotUserIdForIndex(i);
      const botName = i % 2 === 0 ? 'AutoTrader_1' : 'AutoTrader_2';

      // Spread bets over 4.5 minutes (270 seconds) - safe window before betting closes
      const maxSpreadSeconds = 270;
      const baseDelay = (maxSpreadSeconds / totalBets) * i;
      const randomVariation = (Math.random() - 0.5) * 20; // ±10 seconds
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

    // ====== FINAL VALIDATION & LOGGING ======
    const upBets = bets.filter(b => b.prediction === 'up');
    const downBets = bets.filter(b => b.prediction === 'down');

    const finalLargerSide = Math.max(upTotal, downTotal);
    const finalImbalance = finalLargerSide > 0
      ? (Math.abs(upTotal - downTotal) / finalLargerSide) * 100
      : 0;

    const isBalanced = finalImbalance <= this.upDownBalance * 100;

    console.log('');
    console.log('📊 ========== BOT PLAN GENERATED ==========');
    console.log(`   Total Bets    : ${totalBets}`);
    console.log(`   UP Bets       : ${upBets.length} bets = ₦${upTotal.toLocaleString()}`);
    console.log(`   DOWN Bets     : ${downBets.length} bets = ₦${downTotal.toLocaleString()}`);
    console.log(`   Gap           : ₦${Math.abs(upTotal - downTotal).toLocaleString()}`);
    console.log(`   Imbalance     : ${finalImbalance.toFixed(1)}% (vs larger side)`);
    console.log(`   Threshold     : ${this.upDownBalance * 100}%`);
    console.log(`   Status        : ${isBalanced ? '✅ BALANCED' : '❌ OVER THRESHOLD'}`);
    console.log(`   Spread Window : 0 - 270 seconds (4.5 min)`);
    console.log('============================================');
    console.log('');

    // Critical warning if final imbalance is way too high
    if (!isBalanced) {
      console.error(
        `❌ CRITICAL: Final imbalance ${finalImbalance.toFixed(1)}% exceeds threshold ${this.upDownBalance * 100}%!`
      );
    }

    return bets;
  }

  // ==================== MAIN CHECK FUNCTION ====================

  async checkAndPlaceBets(round, io) {
    if (!this.isEnabled) return;
    if (!round || round.status !== 'active') return;

    // Validate bot IDs are configured
    if (!this.botUser1Id || !this.botUser2Id) {
      console.error('❌ Bot user IDs not configured in .env');
      return;
    }

    const roundId = round.id;
    const now = new Date();

    // Initialize plan for this round (only once)
    if (!this.roundBotStatus.has(roundId)) {
      const betCount = this.getRandomBetCount();
      const betPlan = this.generateBetPlan(betCount);

      this.roundBotStatus.set(roundId, {
        startTime: now,
        betPlan: betPlan,
        totalBets: betCount,
        placedCount: 0
      });

      console.log(`🤖 Round #${round.roundNumber} - Bot plan created: ${betCount} bets`);
    }

    const status = this.roundBotStatus.get(roundId);
    const elapsedSeconds = (now - status.startTime) / 1000;

    // Check each bet in plan and place if it's time
    for (let i = 0; i < status.betPlan.length; i++) {
      const bet = status.betPlan[i];

      // Skip already placed bets
      if (bet.placed) continue;

      // Check if it's time to place this bet
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
      // Check how many bets this bot already placed in this round
      const botBetsInRound = await Bet.count({
        where: {
          roundId: round.id,
          userId: botUserId
        }
      });

      // Each bot can place up to half the total bets
      const maxBetsPerBot = Math.ceil(totalBets / 2);
      
      if (botBetsInRound >= maxBetsPerBot) {
        console.log(`🤖 ${botName} reached max bets (${maxBetsPerBot}) for round #${round.roundNumber}`);
        return false;
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

      // Reload round to get fresh data
      await round.reload();

      // Calculate multipliers
      const totalUp = parseFloat(round.totalUpAmount || 0);
      const totalDown = parseFloat(round.totalDownAmount || 0);

      let upMultiplier = 1.7;
      let downMultiplier = 1.7;

      if (totalUp > 0 && totalDown > 0) {
        upMultiplier = parseFloat((1 + (totalDown * 0.7) / totalUp).toFixed(2));
        downMultiplier = parseFloat((1 + (totalUp * 0.7) / totalDown).toFixed(2));
      }

      // Emit to all connected clients
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

      // Calculate current imbalance
      const largerSide = Math.max(totalUp, totalDown);
      const currentImbalance = largerSide > 0 
        ? (Math.abs(totalUp - totalDown) / largerSide * 100).toFixed(1)
        : 0;

      // Log the bet
      console.log(
        `🤖 ${botName} bet #${betNumber}/${totalBets}: ` +
        `${prediction.toUpperCase()} ₦${amount.toLocaleString()} ` +
        `(Round #${round.roundNumber})`
      );
      console.log(
        `   Pool: UP ₦${totalUp.toLocaleString()} (${round.totalUpBets}) | ` +
        `DOWN ₦${totalDown.toLocaleString()} (${round.totalDownBets}) | ` +
        `Imbalance: ${currentImbalance}%`
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
