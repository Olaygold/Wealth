
// server/services/roundService.js
const cron = require('node-cron');
const { Round, Bet, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');
const priceService = require('./priceService');
const { sequelize } = require('../config/database');
const botService = require('./botService');

// ✅ SAFE IMPORT
let processFirstBetBonus = null;
let processInfluencerCommission = null;

try {
  const referralService = require('./referralService');
  processFirstBetBonus = referralService.processFirstBetBonus;
  processInfluencerCommission = referralService.processInfluencerCommission;
  console.log('✅ Referral service loaded successfully');
} catch (error) {
  console.warn('⚠️ Referral service not available:', error.message);
}

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const safeProcessReferral = async (type, userId, betAmount, betId, transaction) => {
  try {
    if (type === 'first_bet' && processFirstBetBonus) {
      const result = await processFirstBetBonus(userId, betAmount, betId, transaction);
      if (result?.success && !result.alreadyProcessed) {
        console.log(`   🎁 First bet bonus: ${result.referrerUsername} earned ₦${result.bonusAmount?.toFixed(2)}`);
      }
      return result;
    }
    
    if (type === 'influencer' && processInfluencerCommission) {
      const result = await processInfluencerCommission(userId, betAmount, betId, transaction);
      if (result?.success && !result.alreadyProcessed) {
        console.log(`   💰 Influencer commission: ${result.influencerUsername} earned ₦${result.commissionAmount?.toFixed(2)}`);
      }
      return result;
    }
    
    return null;
  } catch (error) {
    console.error(`   ⚠️ Referral ${type} error (non-fatal):`, error.message);
    return null;
  }
};

class RoundService {
  constructor() {
    this.io = null;
    this.currentRound = null;
    this.checkInterval = null;
    this.isChecking = false;
    this.lastCheckTime = null;
    
    // ✅ CACHE to reduce DB calls
    this.cachedActiveRound = null;
    this.cachedLockedRound = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5000; // 5 seconds cache
    
    // ✅ NEW: Only betting duration, locked removed
    this.BETTING_DURATION = parseInt(process.env.BETTING_DURATION_MINUTES) || 5;
  }

  async startRoundManager(io) {
    this.io = io;
    console.log('🎮 Starting Round Manager (NEW FLOW)...');
    console.log(`   ⏱️ Betting Period: ${this.BETTING_DURATION} minutes`);
    console.log(`   🔄 Flow: Active → Locked (with result) → New Active immediately`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.initializeRounds();

      // ✅ Check every 10 seconds for faster transitions
      this.checkInterval = setInterval(async () => {
        await this.checkAndUpdateRounds();
      }, 10000);

      console.log('✅ Round Manager started successfully (checking every 10s)');
    } catch (error) {
      console.error('❌ Round Manager startup error:', error.message);
    }
  }

  async initializeRounds() {
    try {
      const activeRound = await Round.findOne({
        where: { status: 'active' },
        order: [['startTime', 'DESC']]
      });

      const lockedRound = await Round.findOne({
        where: { status: 'locked' },
        order: [['endTime', 'DESC']]
      });

      if (activeRound) {
        this.currentRound = activeRound;
        this.cachedActiveRound = activeRound;
        console.log(`📊 Found active round #${activeRound.roundNumber}`);
        
        const now = new Date();
        const endTime = new Date(activeRound.startTime.getTime() + (this.BETTING_DURATION * 60 * 1000));
        
        if (now > endTime) {
          console.log('⚠️ Active round expired, ending it now...');
          await this.endRound(activeRound);
        }
      } else {
        console.log('📊 No active round found. Creating first round...');
        await this.createNewRound(true);
      }

      if (lockedRound) {
        this.cachedLockedRound = lockedRound;
        console.log(`🔒 Found locked round #${lockedRound.roundNumber}`);
      }

      // ✅ Always ensure upcoming round exists
      await this.ensureUpcomingRound();
      
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    } catch (error) {
      console.error('❌ Error initializing rounds:', error.message);
      try {
        await this.createNewRound(true);
      } catch (createError) {
        console.error('❌ Failed to create initial round:', createError.message);
      }
    }
  }

  async createNewRound(startImmediately = false) {
    try {
      const now = new Date();
      
      const lastRound = await Round.findOne({
        order: [['roundNumber', 'DESC']]
      });
      
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      let startTime, endTime;

      if (startImmediately) {
        // ✅ Start NOW
        startTime = now;
        endTime = new Date(now.getTime() + (this.BETTING_DURATION * 60 * 1000));
      } else {
        // ✅ Upcoming round starts when current active ends
        const currentRound = await this.getCurrentRound();
        if (currentRound) {
          startTime = new Date(currentRound.startTime.getTime() + (this.BETTING_DURATION * 60 * 1000) + 1000);
        } else {
          startTime = new Date(now.getTime() + (this.BETTING_DURATION * 60 * 1000));
        }
        endTime = new Date(startTime.getTime() + (this.BETTING_DURATION * 60 * 1000));
      }

      const round = await Round.create({
        roundNumber: nextRoundNumber,
        status: startImmediately ? 'active' : 'upcoming',
        startTime,
        lockTime: endTime, // ✅ Lock time = end time now
        endTime,
        startPrice: startImmediately ? priceService.getPrice() : null
      });

      console.log(`✅ Created round #${round.roundNumber} (${round.status})`);
      console.log(`   Start: ${startTime.toLocaleTimeString()}`);
      console.log(`   End: ${endTime.toLocaleTimeString()}`);

      // ✅ Clear cache
      this.cachedActiveRound = null;
      this.cacheExpiry = null;

      if (startImmediately) {
        this.currentRound = round;
        this.cachedActiveRound = round;
        
        if (this.io) {
          this.io.emit('round_start', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            startPrice: round.startPrice,
            startTime: round.startTime,
            endTime: round.endTime
          });
        }
      }

      return round;
    } catch (error) {
      console.error('❌ Error creating round:', error.message);
      throw error;
    }
  }

  async ensureUpcomingRound() {
    try {
      const upcomingRound = await Round.findOne({
        where: { status: 'upcoming' },
        order: [['startTime', 'ASC']]
      });

      if (!upcomingRound) {
        console.log('📊 Creating upcoming round...');
        await this.createNewRound(false);
      }
    } catch (error) {
      console.error('❌ Error ensuring upcoming round:', error.message);
    }
  }

  async checkAndUpdateRounds() {
    if (this.isChecking) return;

    this.isChecking = true;
    this.lastCheckTime = new Date();
    const now = new Date();

    try {
      // ✅ Check rounds that need action
      const roundsNeedingAction = await Round.findAll({
        where: {
          [Op.or]: [
            { status: 'upcoming', startTime: { [Op.lte]: now } },
            { 
              status: 'active', 
              startTime: { 
                [Op.lte]: new Date(now.getTime() - (this.BETTING_DURATION * 60 * 1000)) 
              } 
            }
          ]
        },
        order: [['startTime', 'ASC']]
      });

      for (const round of roundsNeedingAction) {
        const roundAge = now - new Date(round.startTime);
        const bettingDurationMs = this.BETTING_DURATION * 60 * 1000;

        if (round.status === 'upcoming' && new Date(round.startTime) <= now) {
          await this.startRound(round);
        } else if (round.status === 'active' && roundAge >= bettingDurationMs) {
          await this.endRound(round);
        }
      }

      // ✅ BOT CHECK - Only if there's an active round
      const activeRound = await this.getCurrentRound();
      if (activeRound && activeRound.status === 'active') {
        await botService.checkAndPlaceBets(activeRound, this.io);
      }

    } catch (error) {
      console.error('❌ Error in round check cycle:', error.message);
    } finally {
      this.isChecking = false;
    }
  }

  async startRound(round) {
    try {
      const startPrice = priceService.getPrice();

      await round.update({ status: 'active', startPrice });
      this.currentRound = round;
      
      // ✅ Update cache
      this.cachedActiveRound = round;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`🟢 Round #${round.roundNumber} STARTED at $${startPrice.toLocaleString()}`);

      if (this.io) {
        this.io.emit('round_start', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          startTime: round.startTime,
          endTime: round.endTime
        });
      }

      // ✅ Ensure next upcoming round exists
      await this.ensureUpcomingRound();
    } catch (error) {
      console.error('❌ Error starting round:', error.message);
    }
  }

  async endRound(round) {
    const transaction = await sequelize.transaction();

    try {
      const endPrice = priceService.getPrice();
      const startPrice = parseFloat(round.startPrice);

      let result;
      const priceDiff = endPrice - startPrice;
      const percentChange = (priceDiff / startPrice) * 100;
      
      if (Math.abs(percentChange) < 0.01) {
        result = 'tie';
      } else if (priceDiff > 0) {
        result = 'up';
      } else {
        result = 'down';
      }

      // ✅ NEW: Set to 'locked' first to show result
      await round.update({ status: 'locked', endPrice, result }, { transaction });

      console.log(`🔒 Round #${round.roundNumber} LOCKED with result`);
      console.log(`   💰 Start: $${startPrice.toLocaleString()} → End: $${endPrice.toLocaleString()}`);
      console.log(`   📊 Change: ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${percentChange.toFixed(3)}%)`);
      console.log(`   🎯 Result: ${result.toUpperCase()}`);

      // ✅ Process bets
      await this.processBets(round, result, transaction);

      await transaction.commit();
      console.log('   ✅ Transaction committed successfully');

      // ✅ Update locked round cache
      this.cachedLockedRound = round;
      this.cachedActiveRound = null;
      botService.cleanupRound(round.id);

      // ✅ Emit locked event with result
      if (this.io) {
        this.io.emit('round_locked', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          endPrice,
          result,
          priceChange: priceDiff,
          percentChange: percentChange.toFixed(3)
        });
      }

      // ✅ IMMEDIATELY start the upcoming round (NO DELAY)
      await this.startNextRound();

      // ✅ After 30 seconds, mark locked round as completed
      setTimeout(async () => {
        try {
          await round.update({ status: 'completed' });
          console.log(`✅ Round #${round.roundNumber} marked as completed`);
          
          if (this.cachedLockedRound?.id === round.id) {
            this.cachedLockedRound = null;
          }
        } catch (err) {
          console.error('❌ Error marking round complete:', err.message);
        }
      }, 30000);

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error ending round:', error.message);
      console.error('❌ Stack:', error.stack);

      try {
        await round.update({ status: 'cancelled' });
      } catch (updateError) {
        console.error('❌ Failed to mark round as cancelled');
      }
    }
  }

  // ✅ NEW: Start the next upcoming round immediately
  async startNextRound() {
    try {
      const upcomingRound = await Round.findOne({
        where: { status: 'upcoming' },
        order: [['startTime', 'ASC']]
      });

      if (upcomingRound) {
        console.log(`🚀 Starting next round #${upcomingRound.roundNumber} immediately...`);
        await this.startRound(upcomingRound);
      } else {
        console.log('⚠️ No upcoming round found, creating new one...');
        await this.createNewRound(true);
      }
    } catch (error) {
      console.error('❌ Error starting next round:', error.message);
      // Fallback: create new round
      try {
        await this.createNewRound(true);
      } catch (createError) {
        console.error('❌ Failed to create emergency round:', createError.message);
      }
    }
  }

  // ✅ NEW: Get locked round for display
  async getLockedRound() {
    if (this.cachedLockedRound && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedLockedRound;
    }

    const round = await Round.findOne({
      where: { status: 'locked' },
      order: [['endTime', 'DESC']]
    });

    this.cachedLockedRound = round;
    return round;
  }

  // ✅ NEW: Get upcoming round
  async getUpcomingRound() {
    return await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });
  }

  // ✅ ADMIN FUNCTIONS
  async manualEndRound(roundId) {
    try {
      const round = await Round.findByPk(roundId);
      if (!round) {
        throw new Error('Round not found');
      }
      
      if (round.status === 'completed' || round.status === 'cancelled') {
        throw new Error('Round already ended');
      }

      console.log(`🛑 Admin manually ending round #${round.roundNumber}`);
      await this.endRound(round);
      
      return { success: true, message: `Round #${round.roundNumber} ended successfully` };
    } catch (error) {
      console.error('❌ Manual end round error:', error.message);
      throw error;
    }
  }

  async cancelRound(roundId, reason = 'Admin cancelled') {
    const transaction = await sequelize.transaction();
    
    try {
      const round = await Round.findByPk(roundId, { transaction });
      if (!round) {
        throw new Error('Round not found');
      }

      if (round.status === 'completed' || round.status === 'cancelled') {
        throw new Error('Round already ended or cancelled');
      }

      const bets = await Bet.findAll({
        where: { roundId: round.id, result: 'pending' },
        include: [{ 
          model: User, 
          as: 'user', 
          attributes: ['id', 'username'],
          required: false
        }],
        transaction
      });

      if (bets.length > 0) {
        console.log(`   🔄 Refunding ${bets.length} bets...`);
        await this.refundAllBets(round, bets, transaction, reason);
      }

      await round.update({ 
        status: 'cancelled',
        result: 'cancelled'
      }, { transaction });

      await transaction.commit();

      this.cachedActiveRound = null;
      this.cachedLockedRound = null;
      this.cacheExpiry = null;

      console.log(`❌ Round #${round.roundNumber} CANCELLED - ${reason}`);

      if (this.io) {
        this.io.emit('round_cancelled', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          reason: reason
        });
      }

      return { success: true, message: `Round #${round.roundNumber} cancelled and ${bets.length} bets refunded` };
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Cancel round error:', error.message);
      throw error;
    }
  }

  async forceStartNewRound() {
    try {
      const activeRounds = await Round.findAll({
        where: { status: { [Op.in]: ['active', 'locked'] } }
      });

      for (const round of activeRounds) {
        await this.cancelRound(round.id, 'Force new round started');
      }

      const newRound = await this.createNewRound(true);
      
      return { success: true, message: `New round #${newRound.roundNumber} started`, round: newRound };
    } catch (error) {
      console.error('❌ Force start new round error:', error.message);
      throw error;
    }
  }

  async processBets(round, result, transaction) {
    try {
      const bets = await Bet.findAll({
        where: { roundId: round.id, result: 'pending' },
        include: [{ 
          model: User, 
          as: 'user', 
          attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'],
          required: false
        }],
        transaction
      });

      if (bets.length === 0) {
        console.log('   ℹ️ No bets placed in this round');
        await round.update({ isProcessed: true }, { transaction });
        return;
      }

      const realBets = bets.filter(bet => !bet.isBot);
      const botBets = bets.filter(bet => bet.isBot);

      console.log(`   📊 Processing ${bets.length} bets (${realBets.length} real, ${botBets.length} bot)...`);

      const upBets = bets.filter(bet => bet.prediction === 'up');
      const downBets = bets.filter(bet => bet.prediction === 'down');

      const totalUpPool = upBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
      const totalDownPool = downBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

      console.log(`   📈 UP bets: ${upBets.length} (₦${totalUpPool.toLocaleString()})`);
      console.log(`   📉 DOWN bets: ${downBets.length} (₦${totalDownPool.toLocaleString()})`);

      // TIE
      if (result === 'tie') {
        console.log('   ➖ TIE - Refunding all bets');
        await this.refundAllBets(round, bets, transaction, 'TIE - Price unchanged');
        return;
      }

      let winners, losers, winnerPool, loserPool;

      if (result === 'up') {
        winners = upBets;
        losers = downBets;
        winnerPool = totalUpPool;
        loserPool = totalDownPool;
      } else {
        winners = downBets;
        losers = upBets;
        winnerPool = totalDownPool;
        loserPool = totalUpPool;
      }

      console.log(`   ✅ Winners: ${winners.length} (₦${winnerPool.toLocaleString()})`);
      console.log(`   ❌ Losers: ${losers.length} (₦${loserPool.toLocaleString()})`);

      if (winners.length === 0 && losers.length > 0) {
        console.log('   ❌ EVERYONE PREDICTED WRONG - All lose!');
        await this.processAllAsLosers(round, losers, transaction);
        return;
      }

      if (winners.length > 0 && losers.length === 0) {
        console.log('   🎯 NO OPPONENTS - Refunding winners');
        await this.refundAllBets(round, winners, transaction, 'No opposing bets');
        return;
      }

      console.log('   🎮 NORMAL CASE - Processing payouts');
      
      const platformFee = roundToTwo(loserPool * 0.30);
      const prizePool = roundToTwo(loserPool * 0.70);

      await round.update({
        platformFee: platformFee,
        prizePool: prizePool,
        isProcessed: true
      }, { transaction });

      console.log(`   💰 Losers Pool: ₦${loserPool.toLocaleString()}`);
      console.log(`   🏦 Platform (30%): ₦${platformFee.toLocaleString()}`);
      console.log(`   🎁 Prize Pool (70%): ₦${prizePool.toLocaleString()}`);

      // PROCESS WINNERS
      for (const bet of winners) {
        const betAmount = parseFloat(bet.stakeAmount);
        const shareRatio = betAmount / winnerPool;
        const prizeShare = prizePool * shareRatio;
        const payout = roundToTwo(betAmount + prizeShare);
        const profit = roundToTwo(prizeShare);
        const multiplier = roundToTwo(payout / betAmount);

        await bet.update({
          result: 'win',
          payout: payout,
          profit: profit,
          isPaid: true
        }, { transaction });

        if (bet.isBot) {
          console.log(`   🤖 Bot WIN: ${bet.prediction.toUpperCase()} ₦${betAmount} → ₦${payout} (${multiplier}x)`);
          continue;
        }

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!wallet) {
          console.error(`   ❌ Wallet not found for user ${bet.userId}`);
          continue;
        }

        const currentBalance = parseFloat(wallet.nairaBalance || 0);
        const currentLocked = parseFloat(wallet.lockedBalance || 0);

        const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betAmount));
        const newBalance = roundToTwo(currentBalance - betAmount + payout);

        await wallet.update({
          nairaBalance: newBalance,
          lockedBalance: newLockedBalance,
          totalWon: roundToTwo(parseFloat(wallet.totalWon || 0) + payout)
        }, { transaction });

        await Transaction.create({
          userId: bet.userId,
          type: 'bet_win',
          method: 'internal',
          amount: payout,
          status: 'completed',
          description: `Won ₦${payout.toLocaleString()} in Round #${round.roundNumber} (${multiplier}x)`,
          metadata: { 
            betId: bet.id, 
            roundId: round.id,
            betAmount: betAmount,
            prizeShare: roundToTwo(prizeShare),
            profit: profit,
            multiplier: multiplier
          },
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        }, { transaction });

        console.log(`   ✅ ${bet.user?.username || bet.userId}: Bet ₦${betAmount} → Won ₦${payout} (${multiplier}x)`);

        if (bet.user?.referredBy && !bet.user?.hasPlacedFirstBet) {
          await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
        }

        if (this.io) {
          this.io.to(bet.userId).emit('bet_result', {
            betId: bet.id,
            result: 'win',
            amount: betAmount,
            payout: payout,
            profit: profit,
            multiplier: multiplier,
            newBalance: newBalance
          });
        }
      }

      // PROCESS LOSERS
      for (const bet of losers) {
        const betAmount = parseFloat(bet.stakeAmount);
        
        await bet.update({
          result: 'loss',
          payout: 0,
          profit: -betAmount,
          isPaid: true
        }, { transaction });

        if (bet.isBot) {
          console.log(`   🤖 Bot LOSS: ${bet.prediction.toUpperCase()} ₦${betAmount}`);
          continue;
        }

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!wallet) {
          console.error(`   ❌ Wallet not found for user ${bet.userId}`);
          continue;
        }

        const currentBalance = parseFloat(wallet.nairaBalance || 0);
        const currentLocked = parseFloat(wallet.lockedBalance || 0);

        const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betAmount));
        const newBalance = roundToTwo(currentBalance - betAmount);

        await wallet.update({
          nairaBalance: newBalance,
          lockedBalance: newLockedBalance,
          totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betAmount)
        }, { transaction });

        await Transaction.create({
          userId: bet.userId,
          type: 'bet_loss',
          method: 'internal',
          amount: betAmount,
          status: 'completed',
          description: `Lost ₦${betAmount.toLocaleString()} in Round #${round.roundNumber}`,
          metadata: { betId: bet.id, roundId: round.id },
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        }, { transaction });

        console.log(`   ❌ ${bet.user?.username || bet.userId}: Lost ₦${betAmount}`);

        if (bet.user?.referredBy) {
          if (!bet.user.hasPlacedFirstBet) {
            await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
          }
          await safeProcessReferral('influencer', bet.userId, betAmount, bet.id, transaction);
        }

        if (this.io) {
          this.io.to(bet.userId).emit('bet_result', {
            betId: bet.id,
            result: 'loss',
            amount: betAmount,
            payout: 0,
            profit: -betAmount,
            newBalance: newBalance
          });
        }
      }

      console.log(`   ✅ Round #${round.roundNumber} complete`);

    } catch (error) {
      console.error('❌ Error processing bets:', error.message);
      console.error('❌ Stack:', error.stack);
      throw error;
    }
  }

  async processAllAsLosers(round, losers, transaction) {
    let totalLost = 0;

    for (const bet of losers) {
      const betAmount = parseFloat(bet.stakeAmount);
      totalLost += betAmount;
      
      await bet.update({
        result: 'loss',
        payout: 0,
        profit: -betAmount,
        isPaid: true
      }, { transaction });

      if (bet.isBot) {
        console.log(`   🤖 Bot LOSS: ${bet.prediction.toUpperCase()} ₦${betAmount}`);
        continue;
      }

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        console.error(`   ❌ Wallet not found for user ${bet.userId}`);
        continue;
      }

      const currentBalance = parseFloat(wallet.nairaBalance || 0);
      const currentLocked = parseFloat(wallet.lockedBalance || 0);

      const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betAmount));
      const newBalance = roundToTwo(currentBalance - betAmount);

      await wallet.update({
        nairaBalance: newBalance,
        lockedBalance: newLockedBalance,
        totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betAmount)
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'bet_loss',
        method: 'internal',
        amount: betAmount,
        status: 'completed',
        description: `Lost ₦${betAmount.toLocaleString()} in Round #${round.roundNumber} (all predicted wrong)`,
        metadata: { betId: bet.id, roundId: round.id },
        balanceBefore: currentBalance,
        balanceAfter: newBalance
      }, { transaction });

      console.log(`   ❌ ${bet.user?.username || bet.userId}: Lost ₦${betAmount}`);

      if (bet.user?.referredBy) {
        if (!bet.user.hasPlacedFirstBet) {
          await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
        }
        await safeProcessReferral('influencer', bet.userId, betAmount, bet.id, transaction);
      }

      if (this.io) {
        this.io.to(bet.userId).emit('bet_result', {
          betId: bet.id,
          result: 'loss',
          amount: betAmount,
          payout: 0,
          profit: -betAmount,
          newBalance: newBalance
        });
      }
    }

    await round.update({ 
      platformFee: roundToTwo(totalLost),
      prizePool: 0,
      isProcessed: true 
    }, { transaction });

    console.log(`   🏦 Platform collected: ₦${totalLost.toLocaleString()}`);
  }

  async refundAllBets(round, bets, transaction, reason) {
    for (const bet of bets) {
      const betAmount = parseFloat(bet.stakeAmount);

      await bet.update({
        result: 'refund',
        payout: betAmount,
        profit: 0,
        isPaid: true
      }, { transaction });

      if (bet.isBot) {
        console.log(`   🤖 Bot REFUND: ${bet.prediction.toUpperCase()} ₦${betAmount}`);
        continue;
      }

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        console.error(`   ❌ Wallet not found for user ${bet.userId}`);
        continue;
      }

      const currentBalance = parseFloat(wallet.nairaBalance || 0);
      const currentLocked = parseFloat(wallet.lockedBalance || 0);

      const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betAmount));

      await wallet.update({
        lockedBalance: newLockedBalance
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'refund',
        method: 'internal',
        amount: betAmount,
        status: 'completed',
        description: `Refund ₦${betAmount.toLocaleString()} - Round #${round.roundNumber} (${reason})`,
        metadata: { betId: bet.id, roundId: round.id, reason },
        balanceBefore: currentBalance,
        balanceAfter: currentBalance
      }, { transaction });

      console.log(`   🔄 ${bet.user?.username || bet.userId}: Refunded ₦${betAmount}`);

      if (bet.user?.referredBy && !bet.user?.hasPlacedFirstBet) {
        await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
      }

      if (this.io) {
        this.io.to(bet.userId).emit('bet_result', {
          betId: bet.id,
          result: 'refund',
          amount: betAmount,
          payout: betAmount,
          profit: 0,
          newBalance: currentBalance
        });
      }
    }

    await round.update({ 
      platformFee: 0,
      prizePool: 0,
      isProcessed: true 
    }, { transaction });
  }

  async getCurrentRound() {
    if (this.cachedActiveRound && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedActiveRound;
    }

    const round = await Round.findOne({
      where: { status: 'active' },
      order: [['startTime', 'DESC']]
    });

    this.cachedActiveRound = round;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;

    return round;
  }

  getServerTime() {
    return {
      serverTime: new Date().toISOString(),
      timestamp: Date.now()
    };
  }

  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('🎮 Round manager stopped');
    }
  }
}

const roundService = new RoundService();
module.exports = roundService;
