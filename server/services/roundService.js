
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
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5000; // 5 seconds cache
    
    this.BETTING_DURATION = parseInt(process.env.BETTING_DURATION_MINUTES) || 5;
    this.LOCKED_DURATION = parseInt(process.env.LOCKED_DURATION_MINUTES) || 5;
    this.TOTAL_ROUND_DURATION = this.BETTING_DURATION + this.LOCKED_DURATION;
  }

  async startRoundManager(io) {
    this.io = io;
    console.log('🎮 Starting Round Manager...');
    console.log(`   ⏱️ Betting Period: ${this.BETTING_DURATION} minutes`);
    console.log(`   🔒 Locked Period: ${this.LOCKED_DURATION} minutes`);
    console.log(`   📊 Total Round: ${this.TOTAL_ROUND_DURATION} minutes`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.initializeRounds();

      // ✅ Check every 15 seconds - BALANCED for Supabase free tier
      this.checkInterval = setInterval(async () => {
        await this.checkAndUpdateRounds();
      }, 15000);

      console.log('✅ Round Manager started successfully (checking every 15s)');
    } catch (error) {
      console.error('❌ Round Manager startup error:', error.message);
    }
  }

  async initializeRounds() {
    try {
      const activeRound = await Round.findOne({
        where: { status: { [Op.in]: ['active', 'locked'] } },
        order: [['startTime', 'DESC']]
      });

      if (activeRound) {
        this.currentRound = activeRound;
        this.cachedActiveRound = activeRound;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        console.log(`📊 Found active round #${activeRound.roundNumber} (${activeRound.status})`);
        
        const now = new Date();
        if (now > new Date(activeRound.endTime)) {
          console.log('⚠️ Active round expired, ending it now...');
          await this.endRound(activeRound);
        }
      } else {
        console.log('📊 No active round found. Creating first round...');
        await this.createNewRound(true);
      }

      await this.ensureUpcomingRound();
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

      let startTime, lockTime, endTime;

      if (startImmediately) {
        startTime = now;
        lockTime = new Date(now.getTime() + (this.BETTING_DURATION * 60 * 1000));
        endTime = new Date(now.getTime() + (this.TOTAL_ROUND_DURATION * 60 * 1000));
      } else {
        const currentRound = await this.getCurrentRound();
        if (currentRound) {
          startTime = new Date(new Date(currentRound.endTime).getTime() + 5000);
        } else {
          startTime = new Date(now.getTime() + 10000);
        }
        lockTime = new Date(startTime.getTime() + (this.BETTING_DURATION * 60 * 1000));
        endTime = new Date(startTime.getTime() + (this.TOTAL_ROUND_DURATION * 60 * 1000));
      }

      const round = await Round.create({
        roundNumber: nextRoundNumber,
        status: startImmediately ? 'active' : 'upcoming',
        startTime,
        lockTime,
        endTime,
        startPrice: startImmediately ? priceService.getPrice() : null
      });

      console.log(`✅ Created round #${round.roundNumber} (${round.status})`);

      // ✅ Clear cache
      this.cachedActiveRound = null;
      this.cacheExpiry = null;

      if (startImmediately) {
        this.currentRound = round;
        if (this.io) {
          this.io.emit('round_start', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            startPrice: round.startPrice,
            startTime: round.startTime,
            lockTime: round.lockTime,
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
        await this.createNewRound(false);
      }
    } catch (error) {
      console.error('❌ Error ensuring upcoming round:', error.message);
    }
  }

  async checkAndUpdateRounds() {
    // ✅ Prevent overlapping checks
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.lastCheckTime = new Date();
    const now = new Date();

    try {
      // ✅ SINGLE optimized query for rounds that need action
      const roundsNeedingAction = await Round.findAll({
        where: {
          [Op.or]: [
            { status: 'upcoming', startTime: { [Op.lte]: now } },
            { status: 'active', lockTime: { [Op.lte]: now } },
            { status: 'locked', endTime: { [Op.lte]: now } }
          ]
        },
        order: [['startTime', 'ASC']]
      });

      for (const round of roundsNeedingAction) {
        if (round.status === 'upcoming' && new Date(round.startTime) <= now) {
          await this.startRound(round);
        } else if (round.status === 'active' && new Date(round.lockTime) <= now) {
          await this.lockRound(round);
        } else if (round.status === 'locked' && new Date(round.endTime) <= now) {
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
      
      // ✅ Clear cache
      this.cachedActiveRound = round;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`🟢 Round #${round.roundNumber} STARTED at $${startPrice.toLocaleString()}`);

      if (this.io) {
        this.io.emit('round_start', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          startTime: round.startTime,
          lockTime: round.lockTime,
          endTime: round.endTime
        });
      }

      await this.ensureUpcomingRound();
    } catch (error) {
      console.error('❌ Error starting round:', error.message);
    }
  }

  async lockRound(round) {
    try {
      await round.update({ status: 'locked' });

      // ✅ Clear cache
      this.cachedActiveRound = null;
      this.cacheExpiry = null;

      console.log(`🔒 Round #${round.roundNumber} LOCKED`);

      if (this.io) {
        this.io.emit('round_lock', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          message: `Betting closed! Result in ${this.LOCKED_DURATION} minutes`
        });
      }
    } catch (error) {
      console.error('❌ Error locking round:', error.message);
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

      await round.update({ status: 'completed', endPrice, result }, { transaction });

      console.log(`🏁 Round #${round.roundNumber} ENDED`);
      console.log(`   💰 Start: $${startPrice.toLocaleString()} → End: $${endPrice.toLocaleString()}`);
      console.log(`   📊 Change: ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${percentChange.toFixed(3)}%)`);
      console.log(`   🎯 Result: ${result.toUpperCase()}`);

      await this.processBets(round, result, transaction);

      await transaction.commit();
      console.log('   ✅ Transaction committed successfully');

      // ✅ Clear cache and cleanup bot
      this.cachedActiveRound = null;
      this.cacheExpiry = null;
      botService.cleanupRound(round.id);

      if (this.io) {
        this.io.emit('round_end', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          endPrice,
          result,
          priceChange: priceDiff,
          percentChange: percentChange.toFixed(3)
        });
      }

      await this.ensureUpcomingRound();
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

      // Get all pending bets for this round
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

      // Refund all bets
      if (bets.length > 0) {
        console.log(`   🔄 Refunding ${bets.length} bets...`);
        await this.refundAllBets(round, bets, transaction, reason);
      }

      await round.update({ 
        status: 'cancelled',
        result: 'cancelled'
      }, { transaction });

      await transaction.commit();

      // ✅ Clear cache
      this.cachedActiveRound = null;
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
      // Cancel any current active/locked rounds
      const activeRounds = await Round.findAll({
        where: { status: { [Op.in]: ['active', 'locked'] } }
      });

      for (const round of activeRounds) {
        await this.cancelRound(round.id, 'Force new round started');
      }

      // Create new round
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

      // ✅ Separate bot and real bets for logging
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

      // Everyone predicted WRONG
      if (winners.length === 0 && losers.length > 0) {
        console.log('   ❌ EVERYONE PREDICTED WRONG - All lose!');
        await this.processAllAsLosers(round, losers, transaction);
        return;
      }

      // Everyone predicted CORRECT but no opponents
      if (winners.length > 0 && losers.length === 0) {
        console.log('   🎯 NO OPPONENTS - Refunding winners');
        await this.refundAllBets(round, winners, transaction, 'No opposing bets');
        return;
      }

      // NORMAL CASE
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

        // ✅ SKIP WALLET UPDATE FOR BOT BETS
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

        // SAFE REFERRAL
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

        // ✅ SKIP WALLET UPDATE FOR BOT BETS
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

        // SAFE REFERRAL
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

      // ✅ SKIP WALLET UPDATE FOR BOT BETS
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

      // SAFE REFERRAL
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

      // ✅ SKIP WALLET UPDATE FOR BOT BETS
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

      // SAFE REFERRAL
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

  // ✅ OPTIMIZED - Uses cache to reduce DB calls
  async getCurrentRound() {
    // Check cache first
    if (this.cachedActiveRound && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedActiveRound;
    }

    // Fetch from DB
    const round = await Round.findOne({
      where: { status: { [Op.in]: ['active', 'locked'] } },
      order: [['startTime', 'DESC']]
    });

    // Update cache
    this.cachedActiveRound = round;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;

    return round;
  }

  // ✅ Get server time for frontend sync
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
