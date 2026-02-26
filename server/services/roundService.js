
// server/services/roundService.js
const cron = require('node-cron');
const { Round, Bet, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');
const priceService = require('./priceService');
const { sequelize } = require('../config/database');
const { processInfluencerCommission, processFirstBetBonus } = require('./referralService'); // ✅ ADD THIS

// Helper function
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

class RoundService {
  constructor() {
    this.io = null;
    this.currentRound = null;
    this.checkInterval = null;
    
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

      this.checkInterval = setInterval(async () => {
        await this.checkAndUpdateRounds();
      }, 5000);

      cron.schedule('*/30 * * * * *', async () => {
        await this.checkAndUpdateRounds();
      });

      console.log('✅ Round Manager started successfully');
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
    const now = new Date();

    try {
      const roundsToStart = await Round.findAll({
        where: { status: 'upcoming', startTime: { [Op.lte]: now } }
      });

      for (const round of roundsToStart) {
        await this.startRound(round);
      }

      const roundsToLock = await Round.findAll({
        where: { status: 'active', lockTime: { [Op.lte]: now } }
      });

      for (const round of roundsToLock) {
        await this.lockRound(round);
      }

      const roundsToEnd = await Round.findAll({
        where: { status: 'locked', endTime: { [Op.lte]: now } }
      });

      for (const round of roundsToEnd) {
        await this.endRound(round);
      }
    } catch (error) {
      console.error('❌ Error in round check cycle:', error.message);
    }
  }

  async startRound(round) {
    try {
      const startPrice = priceService.getPrice();

      await round.update({ status: 'active', startPrice });
      this.currentRound = round;

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

      try {
        await round.update({ status: 'cancelled' });
      } catch (updateError) {
        console.error('❌ Failed to mark round as cancelled');
      }
    }
  }

  // ============================================================
  // ✅ FAIR SETTLEMENT - 30% FEE FROM LOSERS ONLY
  // ============================================================
  async processBets(round, result, transaction) {
    try {
      const bets = await Bet.findAll({
        where: { roundId: round.id, result: 'pending' },
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'] }], // ✅ Include referredBy
        transaction
      });

      if (bets.length === 0) {
        console.log('   ℹ️ No bets placed in this round');
        await round.update({ isProcessed: true }, { transaction });
        return;
      }

      console.log(`   📊 Processing ${bets.length} bets...`);

      // Separate by prediction
      const upBets = bets.filter(bet => bet.prediction === 'up');
      const downBets = bets.filter(bet => bet.prediction === 'down');

      const totalUpPool = upBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
      const totalDownPool = downBets.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

      console.log(`   📈 UP bets: ${upBets.length} (₦${totalUpPool.toLocaleString()})`);
      console.log(`   📉 DOWN bets: ${downBets.length} (₦${totalDownPool.toLocaleString()})`);

      // ===== CASE 1: TIE - Refund everyone =====
      if (result === 'tie') {
        console.log('   ➖ TIE - Refunding all bets');
        await this.refundAllBets(round, bets, transaction, 'TIE - Price unchanged');
        return;
      }

      // Determine winners and losers
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

      // ===== CASE 2: Everyone predicted WRONG - ALL LOSE =====
      if (winners.length === 0 && losers.length > 0) {
        console.log('   ❌ EVERYONE PREDICTED WRONG - All lose!');
        await this.processAllAsLosers(round, losers, transaction);
        return;
      }

      // ===== CASE 3: Everyone predicted CORRECT but no opponents - REFUND =====
      if (winners.length > 0 && losers.length === 0) {
        console.log('   🎯 NO OPPONENTS - Refunding winners');
        await this.refundAllBets(round, winners, transaction, 'No opposing bets');
        return;
      }

      // ===== CASE 4: NORMAL - Both winners and losers =====
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

      // ===== PROCESS WINNERS =====
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

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const currentBalance = parseFloat(wallet.nairaBalance);
        const currentLocked = parseFloat(wallet.lockedBalance);

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

        console.log(`   ✅ ${bet.user?.username}: Bet ₦${betAmount} → Won ₦${payout} (${multiplier}x)`);

        // ✅ PROCESS FIRST BET BONUS (for normal referrers)
        if (!bet.user.hasPlacedFirstBet) {
          try {
            await processFirstBetBonus(bet.userId, betAmount, bet.id, transaction);
          } catch (bonusError) {
            console.error(`   ⚠️ First bet bonus error for ${bet.user.username}:`, bonusError.message);
          }
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

      // ===== PROCESS LOSERS =====
      for (const bet of losers) {
        const betAmount = parseFloat(bet.stakeAmount);
        
        await bet.update({
          result: 'loss',
          payout: 0,
          profit: -betAmount,
          isPaid: true
        }, { transaction });

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const currentBalance = parseFloat(wallet.nairaBalance);
        const currentLocked = parseFloat(wallet.lockedBalance);

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

        console.log(`   ❌ ${bet.user?.username}: Lost ₦${betAmount}`);

        // ✅ PROCESS INFLUENCER COMMISSION ON LOSSES
        try {
          const commissionResult = await processInfluencerCommission(
            bet.userId,      // User who lost
            betAmount,       // Amount they lost
            bet.id,          // Bet ID
            transaction      // DB transaction
          );

          if (commissionResult && commissionResult.success && !commissionResult.alreadyProcessed) {
            console.log(`   💰 Influencer ${commissionResult.influencerUsername} earned ₦${commissionResult.commissionAmount.toFixed(2)} (${commissionResult.commissionPercentage}%)`);
          }
        } catch (commissionError) {
          console.error(`   ⚠️ Commission error for ${bet.user?.username}:`, commissionError.message);
          // Don't throw - continue with bet processing
        }

        // ✅ PROCESS FIRST BET BONUS (if applicable)
        if (!bet.user.hasPlacedFirstBet) {
          try {
            await processFirstBetBonus(bet.userId, betAmount, bet.id, transaction);
          } catch (bonusError) {
            console.error(`   ⚠️ First bet bonus error for ${bet.user.username}:`, bonusError.message);
          }
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
      throw error;
    }
  }

  // ============================================================
  // ALL LOSE - Everyone predicted wrong
  // ============================================================
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

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const currentBalance = parseFloat(wallet.nairaBalance);
      const currentLocked = parseFloat(wallet.lockedBalance);

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

      console.log(`   ❌ ${bet.user?.username}: Lost ₦${betAmount}`);

      // ✅ PROCESS INFLUENCER COMMISSION
      try {
        const commissionResult = await processInfluencerCommission(
          bet.userId,
          betAmount,
          bet.id,
          transaction
        );

        if (commissionResult && commissionResult.success && !commissionResult.alreadyProcessed) {
          console.log(`   💰 Influencer ${commissionResult.influencerUsername} earned ₦${commissionResult.commissionAmount.toFixed(2)}`);
        }
      } catch (commissionError) {
        console.error(`   ⚠️ Commission error:`, commissionError.message);
      }

      // ✅ PROCESS FIRST BET BONUS
      if (!bet.user.hasPlacedFirstBet) {
        try {
          await processFirstBetBonus(bet.userId, betAmount, bet.id, transaction);
        } catch (bonusError) {
          console.error(`   ⚠️ First bet bonus error:`, bonusError.message);
        }
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

  // ============================================================
  // REFUND ALL BETS
  // ============================================================
  async refundAllBets(round, bets, transaction, reason) {
    for (const bet of bets) {
      const betAmount = parseFloat(bet.stakeAmount);

      await bet.update({
        result: 'refund',
        payout: betAmount,
        profit: 0,
        isPaid: true
      }, { transaction });

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const currentBalance = parseFloat(wallet.nairaBalance);
      const currentLocked = parseFloat(wallet.lockedBalance);

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

      console.log(`   🔄 ${bet.user?.username}: Refunded ₦${betAmount}`);

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
    return await Round.findOne({
      where: { status: { [Op.in]: ['active', 'locked'] } },
      order: [['startTime', 'DESC']]
    });
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
