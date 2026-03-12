
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
    // Maximum allowed difference between BOT's UP and DOWN bets (STRICT)
    this.maxBotDifference = parseInt(process.env.BOT_MAX_DIFFERENCE) || 250;
    
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
    console.log(`   Max BOT difference: ₦${this.maxBotDifference} (STRICT)`);
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

  // ==================== STRICT BALANCED BOT PLAN ====================
  
  generateBalancedBotPlan(totalBets) {
    const bets = [];
    let botUpTotal = 0;
    let botDownTotal = 0;
    let attempts = 0;
    const maxAttempts = 5;

    // Try to generate a valid plan (max 5 attempts)
    while (attempts < maxAttempts) {
      attempts++;
      bets.length = 0;
      botUpTotal = 0;
      botDownTotal = 0;

      for (let i = 0; i < totalBets; i++) {
        let amount = this.getRandomAmount();
        let prediction;

        // Current difference
        const currentDiff = Math.abs(botUpTotal - botDownTotal);
        
        // Calculate what happens if we bet each side
        const newUpTotal = botUpTotal + amount;
        const newDownTotal = botDownTotal + amount;
        const diffIfUp = Math.abs(newUpTotal - botDownTotal);
        const diffIfDown = Math.abs(botUpTotal - newDownTotal);

        // STRICT DECISION LOGIC
        if (i === 0) {
          // First bet - random
          prediction = Math.random() > 0.5 ? 'up' : 'down';
        }
        else if (diffIfUp <= this.maxBotDifference && diffIfDown > this.maxBotDifference) {
          // Only UP is allowed
          prediction = 'up';
        }
        else if (diffIfDown <= this.maxBotDifference && diffIfUp > this.maxBotDifference) {
          // Only DOWN is allowed
          prediction = 'down';
        }
        else if (diffIfUp > this.maxBotDifference && diffIfDown > this.maxBotDifference) {
          // Both would exceed - REDUCE AMOUNT to fit
          const weaker = botUpTotal < botDownTotal ? 'up' : 'down';
          prediction = weaker;
          
          // Calculate safe amount
          const strongerTotal = Math.max(botUpTotal, botDownTotal);
          const weakerTotal = Math.min(botUpTotal, botDownTotal);
          const gap = strongerTotal - weakerTotal;
          
          // Max we can add to weaker side
          const maxSafeAmount = this.maxBotDifference - gap;
          
          if (maxSafeAmount < 100) {
            // Can't fit any bet - try next
            continue;
          }
          
          // Use smaller amount
          amount = Math.min(amount, maxSafeAmount);
          amount = Math.max(100, Math.round(amount / 50) * 50);
        }
        else {
          // Both are safe - bias toward weaker side
          if (botUpTotal < botDownTotal) {
            prediction = Math.random() < 0.70 ? 'up' : 'down';
          } else if (botDownTotal < botUpTotal) {
            prediction = Math.random() < 0.70 ? 'down' : 'up';
          } else {
            prediction = Math.random() > 0.5 ? 'up' : 'down';
          }
        }

        // Apply bet
        if (prediction === 'up') {
          botUpTotal += amount;
        } else {
          botDownTotal += amount;
        }

        // Store bet
        const maxSpreadSeconds = 270;
        const baseDelay = (maxSpreadSeconds / totalBets) * i;
        const randomVariation = (Math.random() - 0.5) * 20;
        const delay = Math.max(0, Math.floor(baseDelay + randomVariation));

        const botUserId = this.getBotUserIdForIndex(i);
        const botName = i % 2 === 0 ? 'AutoTrader_1' : 'AutoTrader_2';

        bets.push({
          prediction,
          amount,
          delay,
          botUserId,
          botName,
          placed: false
        });
      }

      // Check if this plan is valid
      const finalDiff = Math.abs(botUpTotal - botDownTotal);
      
      if (finalDiff <= this.maxBotDifference) {
        // SUCCESS! Plan is valid
        break;
      } else if (attempts < maxAttempts) {
        console.log(`⚠️  Attempt ${attempts} failed (diff: ₦${finalDiff}), retrying...`);
      }
    }

    // Sort by delay
    bets.sort((a, b) => a.delay - b.delay);

    // Final stats
    const finalDiff = Math.abs(botUpTotal - botDownTotal);
    const upBets = bets.filter(b => b.prediction === 'up');
    const downBets = bets.filter(b => b.prediction === 'down');
    const isValid = finalDiff <= this.maxBotDifference;

    console.log('');
    console.log('📊 ======= BOT PLAN (BOT BETS ONLY) =======');
    console.log(`   Attempts       : ${attempts}`);
    console.log(`   Total Bets     : ${bets.length}`);
    console.log(`   BOT UP Total   : ₦${botUpTotal.toLocaleString()} (${upBets.length} bets)`);
    console.log(`   BOT DOWN Total : ₦${botDownTotal.toLocaleString()} (${downBets.length} bets)`);
    console.log(`   BOT Difference : ₦${finalDiff}`);
    console.log(`   Max Allowed    : ₦${this.maxBotDifference}`);
    console.log(`   Status         : ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log('============================================');
    console.log('');

    if (!isValid) {
      console.error(`❌ CRITICAL: Could not generate valid plan after ${attempts} attempts!`);
    }

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
      const betCount = this.getRandomBetCount();
      const plan = this.generateBalancedBotPlan(betCount);

      this.roundBotStatus.set(roundId, {
        startTime: now,
        bets: plan.bets,
        totalBets: betCount,
        placedCount: 0,
        botUpTotal: 0,
        botDownTotal: 0,
        plannedUpTotal: plan.botUpTotal,
        plannedDownTotal: plan.botDownTotal
      });

      console.log(`🤖 Round #${round.roundNumber} - Bot plan created: ${betCount} bets | Diff: ₦${plan.finalDiff}/${this.maxBotDifference}`);
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
      const botBetsInRound = await Bet.count({
        where: { roundId: round.id, userId: botUserId }
      });

      const maxBetsPerBot = Math.ceil(totalBets / 2);
      
      if (botBetsInRound >= maxBetsPerBot) {
        console.log(`🤖 ${botName} reached max bets (${maxBetsPerBot})`);
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
        `🤖 ${botName} #${betNumber}/${totalBets}: ${prediction.toUpperCase()} ₦${amount} (Round #${round.roundNumber})`
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
        `🧹 Round ${roundId}: ${status.placedCount}/${status.totalBets} bets | ` +
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
          betsPerRound: `${this.minBetsPerRound}-${this.maxBetsPerRound}`,
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

  setMaxDifference(maxDiff) {
    this.maxBotDifference = parseInt(maxDiff);
    console.log(`🤖 Max bot difference: ₦${maxDiff}`);
    return this.maxBotDifference;
  }
}

const botService = new BotService();
module.exports = botService;
