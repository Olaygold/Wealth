
const cron = require('node-cron');
const { Round, Bet, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');
const priceService = require('./priceService');
const { sequelize } = require('../config/database');
const {
  calculatePlatformCut,
  calculatePrizePool,
  calculateWinnerPayout,
  calculateProfit,
  roundToTwo
} = require('../utils/helpers');

class RoundService {
  constructor() {
    this.io = null;
    this.currentRound = null;
    this.checkInterval = null;
    
    // Timing configuration (in minutes)
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
        where: {
          status: { [Op.in]: ['active', 'locked'] }
        },
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
      console.log(`   🟢 Start: ${startTime.toLocaleTimeString()}`);
      console.log(`   🔒 Lock: ${lockTime.toLocaleTimeString()}`);
      console.log(`   🏁 End: ${endTime.toLocaleTimeString()}`);

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
      } else {
        if (this.io) {
          this.io.emit('round_created', {
            roundNumber: round.roundNumber,
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
        console.log('📊 Creating upcoming round...');
        await this.createNewRound(false);
      }
    } catch (error) {
      console.error('❌ Error ensuring upcoming round:', error.message);
    }
  }

  async checkAndUpdateRounds() {
    const now = new Date();

    try {
      // 1. Start upcoming rounds
      const roundsToStart = await Round.findAll({
        where: {
          status: 'upcoming',
          startTime: { [Op.lte]: now }
        }
      });

      for (const round of roundsToStart) {
        await this.startRound(round);
      }

      // 2. Lock active rounds when betting ends
      const roundsToLock = await Round.findAll({
        where: {
          status: 'active',
          lockTime: { [Op.lte]: now }
        }
      });

      for (const round of roundsToLock) {
        await this.lockRound(round);
      }

      // 3. End locked rounds
      const roundsToEnd = await Round.findAll({
        where: {
          status: 'locked',
          endTime: { [Op.lte]: now }
        }
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

      await round.update({
        status: 'active',
        startPrice
      });

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

      console.log(`🔒 Round #${round.roundNumber} LOCKED - Betting closed`);
      console.log(`   ⏳ Waiting ${this.LOCKED_DURATION} minutes for result...`);

      if (this.io) {
        this.io.emit('round_lock', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          message: `Betting closed! Result in ${this.LOCKED_DURATION} minutes`,
          resultTime: round.endTime
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

      // Determine result
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

      await round.update({
        status: 'completed',
        endPrice,
        result
      }, { transaction });

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
        console.error('❌ Failed to mark round as cancelled:', updateError.message);
      }
    }
  }

  // ✅ FULLY FIXED: Process bets with correct wallet balance logic
  async processBets(round, result, transaction) {
    try {
      const bets = await Bet.findAll({
        where: { 
          roundId: round.id,
          result: 'pending'
        },
        include: [{ 
          model: User, 
          as: 'user',
          attributes: ['id', 'username']
        }],
        transaction
      });

      if (bets.length === 0) {
        console.log('   ℹ️ No bets placed in this round');
        await round.update({ isProcessed: true }, { transaction });
        return;
      }

      console.log(`   📊 Processing ${bets.length} bets...`);

      // CASE 1: TIE - Refund everyone
      if (result === 'tie') {
        console.log('   ➖ TIE - Refunding all bets');
        await this.refundAllBets(round, bets, transaction, 'TIE - Price unchanged');
        return;
      }

      // Separate winners and losers
      const winners = bets.filter(bet => bet.prediction === result);
      const losers = bets.filter(bet => bet.prediction !== result);

      console.log(`   ✅ Winners: ${winners.length}`);
      console.log(`   ❌ Losers: ${losers.length}`);

      const totalWinningStakes = winners.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
      const totalLosingStakes = losers.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

      // CASE 2: No winners - All lose
      if (winners.length === 0) {
        console.log('   ❌ NO WINNERS - Everyone loses!');
        await this.processAllAsLosers(round, bets, transaction);
        return;
      }

      // CASE 3: No losers - Winners get 1x
      if (losers.length === 0) {
        console.log('   🎯 NO LOSERS - Winners get 1x (stake back)');
        await this.processWinnersOnly(round, winners, transaction);
        return;
      }

      // CASE 4: NORMAL - Both winners and losers
      console.log('   🎮 NORMAL CASE - Processing payouts');
      
      const platformCut = calculatePlatformCut(totalLosingStakes); // 30%
      const prizePool = calculatePrizePool(totalLosingStakes);     // 70%

      await round.update({
        platformCut: roundToTwo(platformCut),
        prizePool: roundToTwo(prizePool),
        isProcessed: true
      }, { transaction });

      console.log(`   💰 Losers Pool: ₦${totalLosingStakes.toLocaleString()}`);
      console.log(`   🏦 Platform (30%): ₦${platformCut.toLocaleString()}`);
      console.log(`   🎁 Prize Pool (70%): ₦${prizePool.toLocaleString()}`);

      // ✅ PROCESS WINNERS - FIXED LOGIC
      for (const bet of winners) {
        const betTotalAmount = parseFloat(bet.totalAmount); // What user originally paid
        const stakeAmount = parseFloat(bet.stakeAmount);    // What's in the pool
        const shareRatio = stakeAmount / totalWinningStakes;
        const prizeShare = prizePool * shareRatio;
        const payout = stakeAmount + prizeShare;            // Total money won
        const profit = payout - betTotalAmount;             // Actual profit

        await bet.update({
          result: 'win',
          payout: roundToTwo(payout),
          profit: roundToTwo(profit),
          isPaid: true
        }, { transaction });

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const currentBalance = parseFloat(wallet.nairaBalance);
        const currentLocked = parseFloat(wallet.lockedBalance);

        // ✅ FIXED: 
        // 1. Remove bet from locked
        // 2. Remove bet from balance
        // 3. Add payout to balance
        const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betTotalAmount));
        const newBalance = roundToTwo(currentBalance - betTotalAmount + payout);

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
          description: `Won ₦${roundToTwo(payout).toLocaleString()} in Round #${round.roundNumber}`,
          metadata: { 
            betId: bet.id, 
            roundId: round.id,
            betAmount: betTotalAmount,
            stakeAmount: stakeAmount,
            prizeShare: roundToTwo(prizeShare),
            profit: roundToTwo(profit),
            multiplier: roundToTwo(payout / stakeAmount)
          },
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        }, { transaction });

        const multiplier = roundToTwo(payout / stakeAmount);
        console.log(`   ✅ ${bet.user.username}: Bet ₦${betTotalAmount} → Won ₦${roundToTwo(payout)} (${multiplier}x, Profit: ₦${roundToTwo(profit)})`);

        // Emit to user
        if (this.io) {
          this.io.to(bet.userId).emit('bet_result', {
            betId: bet.id,
            result: 'win',
            payout: roundToTwo(payout),
            profit: roundToTwo(profit),
            multiplier,
            newBalance,
            newLockedBalance
          });
        }
      }

      // ✅ PROCESS LOSERS - FIXED LOGIC
      for (const bet of losers) {
        const betTotalAmount = parseFloat(bet.totalAmount); // What user paid
        const stakeAmount = parseFloat(bet.stakeAmount);    // What was in pool
        
        await bet.update({
          result: 'loss',
          payout: 0,
          profit: -betTotalAmount,  // Lost full bet amount
          isPaid: true
        }, { transaction });

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const currentBalance = parseFloat(wallet.nairaBalance);
        const currentLocked = parseFloat(wallet.lockedBalance);

        // ✅ FIXED:
        // 1. Remove from locked
        // 2. Deduct from balance
        const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betTotalAmount));
        const newBalance = roundToTwo(currentBalance - betTotalAmount);

        await wallet.update({
          nairaBalance: newBalance,
          lockedBalance: newLockedBalance,
          totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betTotalAmount)
        }, { transaction });

        await Transaction.create({
          userId: bet.userId,
          type: 'bet_loss',
          method: 'internal',
          amount: betTotalAmount,
          status: 'completed',
          description: `Lost ₦${betTotalAmount.toLocaleString()} in Round #${round.roundNumber}`,
          metadata: { 
            betId: bet.id, 
            roundId: round.id,
            betAmount: betTotalAmount,
            stakeAmount: stakeAmount
          },
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        }, { transaction });

        console.log(`   ❌ ${bet.user.username}: Lost ₦${betTotalAmount}`);

        // Emit to user
        if (this.io) {
          this.io.to(bet.userId).emit('bet_result', {
            betId: bet.id,
            result: 'loss',
            payout: 0,
            profit: -betTotalAmount,
            newBalance,
            newLockedBalance
          });
        }
      }

      console.log(`   ✅ Round #${round.roundNumber} processing complete`);

    } catch (error) {
      console.error('❌ Error processing bets:', error.message);
      throw error;
    }
  }

  // ✅ FIXED: Refund all bets (for TIE)
  async refundAllBets(round, bets, transaction, reason) {
    for (const bet of bets) {
      const betTotalAmount = parseFloat(bet.totalAmount); // Full refund

      await bet.update({
        result: 'refund',
        payout: betTotalAmount,
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

      // ✅ FIXED: Just remove from locked (money stays in balance)
      const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betTotalAmount));

      await wallet.update({
        lockedBalance: newLockedBalance
        // nairaBalance stays same - money was locked, now unlocked
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'refund',
        method: 'internal',
        amount: betTotalAmount,
        status: 'completed',
        description: `Refund for Round #${round.roundNumber} (${reason})`,
        metadata: { 
          betId: bet.id, 
          roundId: round.id, 
          reason 
        },
        balanceBefore: currentBalance,
        balanceAfter: currentBalance // No change to balance
      }, { transaction });

      console.log(`   🔄 ${bet.user?.username}: Refunded ₦${betTotalAmount}`);

      // Emit to user
      if (this.io) {
        this.io.to(bet.userId).emit('bet_result', {
          betId: bet.id,
          result: 'refund',
          payout: betTotalAmount,
          profit: 0,
          newBalance: currentBalance,
          newLockedBalance
        });
      }
    }

    await round.update({ isProcessed: true }, { transaction });
  }

  // ✅ FIXED: All lose (no winners)
  async processAllAsLosers(round, bets, transaction) {
    let totalLost = 0;

    for (const bet of bets) {
      const betTotalAmount = parseFloat(bet.totalAmount);
      totalLost += betTotalAmount;
      
      await bet.update({
        result: 'loss',
        payout: 0,
        profit: -betTotalAmount,
        isPaid: true
      }, { transaction });

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const currentBalance = parseFloat(wallet.nairaBalance);
      const currentLocked = parseFloat(wallet.lockedBalance);

      // ✅ FIXED: Remove from locked AND balance
      const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betTotalAmount));
      const newBalance = roundToTwo(currentBalance - betTotalAmount);

      await wallet.update({
        nairaBalance: newBalance,
        lockedBalance: newLockedBalance,
        totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betTotalAmount)
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'bet_loss',
        method: 'internal',
        amount: betTotalAmount,
        status: 'completed',
        description: `Lost ₦${betTotalAmount.toLocaleString()} in Round #${round.roundNumber}`,
        metadata: { betId: bet.id, roundId: round.id },
        balanceBefore: currentBalance,
        balanceAfter: newBalance
      }, { transaction });

      console.log(`   ❌ ${bet.user?.username}: Lost ₦${betTotalAmount}`);

      if (this.io) {
        this.io.to(bet.userId).emit('bet_result', {
          betId: bet.id,
          result: 'loss',
          payout: 0,
          profit: -betTotalAmount,
          newBalance,
          newLockedBalance
        });
      }
    }

    await round.update({ 
      platformCut: roundToTwo(totalLost),
      prizePool: 0,
      isProcessed: true 
    }, { transaction });

    console.log(`   🏦 Platform collected: ₦${totalLost.toLocaleString()}`);
  }

  // ✅ FIXED: Winners only (no losers) - 1x payout
  async processWinnersOnly(round, winners, transaction) {
    for (const bet of winners) {
      const betTotalAmount = parseFloat(bet.totalAmount);
      const stakeAmount = parseFloat(bet.stakeAmount);
      const payout = stakeAmount; // 1x - just stake back
      const profit = payout - betTotalAmount; // Usually negative due to fee

      await bet.update({
        result: 'win',
        payout: roundToTwo(payout),
        profit: roundToTwo(profit),
        isPaid: true
      }, { transaction });

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const currentBalance = parseFloat(wallet.nairaBalance);
      const currentLocked = parseFloat(wallet.lockedBalance);

      // ✅ FIXED:
      // Remove from locked, deduct bet, add payout
      const newLockedBalance = roundToTwo(Math.max(0, currentLocked - betTotalAmount));
      const newBalance = roundToTwo(currentBalance - betTotalAmount + payout);

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
        description: `Won ₦${roundToTwo(payout).toLocaleString()} in Round #${round.roundNumber} (1x - no opponents)`,
        metadata: { 
          betId: bet.id, 
          roundId: round.id,
          betAmount: betTotalAmount,
          stakeReturned: stakeAmount,
          prizeShare: 0,
          profit: roundToTwo(profit),
          multiplier: 1,
          reason: 'No losing bets'
        },
        balanceBefore: currentBalance,
        balanceAfter: newBalance
      }, { transaction });

      console.log(`   ✅ ${bet.user?.username}: Bet ₦${betTotalAmount} → Won ₦${roundToTwo(payout)} (1x, Profit: ₦${roundToTwo(profit)})`);

      if (this.io) {
        this.io.to(bet.userId).emit('bet_result', {
          betId: bet.id,
          result: 'win',
          payout: roundToTwo(payout),
          profit: roundToTwo(profit),
          multiplier: 1,
          newBalance,
          newLockedBalance
        });
      }
    }

    const totalFees = winners.reduce((sum, bet) => sum + parseFloat(bet.feeAmount), 0);
    
    await round.update({ 
      platformCut: roundToTwo(totalFees),
      prizePool: 0,
      isProcessed: true 
    }, { transaction });

    console.log(`   🏦 Platform collected (fees): ₦${totalFees.toLocaleString()}`);
  }

  async getCurrentRound() {
    return await Round.findOne({
      where: {
        status: { [Op.in]: ['active', 'locked'] }
      },
      order: [['startTime', 'DESC']]
    });
  }

  async getUpcomingRound() {
    return await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
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
