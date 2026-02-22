
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
  }

  // Start round manager
  async startRoundManager(io) {
    this.io = io;
    console.log('🎮 Starting Round Manager...');

    try {
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Initialize rounds
      await this.initializeRounds();

      // Check rounds every 10 seconds for accuracy
      this.checkInterval = setInterval(async () => {
        await this.checkAndUpdateRounds();
      }, 10000);

      // Also use cron for backup (every minute)
      cron.schedule('* * * * *', async () => {
        await this.checkAndUpdateRounds();
      });

      console.log('✅ Round Manager started successfully');
    } catch (error) {
      console.error('❌ Round Manager startup error:', error.message);
    }
  }

  // Initialize rounds on server start
  async initializeRounds() {
    try {
      // Check for active round
      const activeRound = await Round.findOne({
        where: {
          status: {
            [Op.in]: ['active', 'locked']
          }
        },
        order: [['startTime', 'DESC']]
      });

      if (activeRound) {
        this.currentRound = activeRound;
        console.log(`📊 Found active round #${activeRound.roundNumber} (${activeRound.status})`);
        
        // Check if it should have ended already
        const now = new Date();
        if (now > new Date(activeRound.endTime)) {
          console.log('⚠️ Active round expired, ending it now...');
          await this.endRound(activeRound);
        }
      } else {
        console.log('📊 No active round found. Creating first round...');
        await this.createNewRound(true); // Create and start immediately
      }

      // Ensure we have upcoming round
      await this.ensureUpcomingRound();

    } catch (error) {
      console.error('❌ Error initializing rounds:', error.message);
      // Try to create a round anyway
      try {
        await this.createNewRound(true);
      } catch (createError) {
        console.error('❌ Failed to create initial round:', createError.message);
      }
    }
  }

  // Create new round
  async createNewRound(startImmediately = false) {
    try {
      const now = new Date();
      const roundDuration = parseInt(process.env.ROUND_DURATION_MINUTES) || 5;
      
      // Get last round number
      const lastRound = await Round.findOne({
        order: [['roundNumber', 'DESC']]
      });
      
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      let startTime, lockTime, endTime;

      if (startImmediately) {
        // Start immediately
        startTime = now;
        lockTime = new Date(now.getTime() + ((roundDuration * 60000) - 30000)); // Lock 30s before end
        endTime = new Date(now.getTime() + (roundDuration * 60000));
      } else {
        // Start after current round ends
        const currentRound = await this.getCurrentRound();
        if (currentRound) {
          startTime = new Date(currentRound.endTime.getTime() + 5000); // 5 seconds gap
        } else {
          startTime = new Date(now.getTime() + 10000); // 10 seconds from now
        }
        lockTime = new Date(startTime.getTime() + ((roundDuration * 60000) - 30000));
        endTime = new Date(startTime.getTime() + (roundDuration * 60000));
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
      console.log(`   Start: ${startTime.toLocaleTimeString()}`);
      console.log(`   End: ${endTime.toLocaleTimeString()}`);
      console.log(`   Duration: ${roundDuration} minutes`);

      if (startImmediately) {
        this.currentRound = round;
        
        // Broadcast round start
        if (this.io) {
          this.io.emit('round_start', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            startPrice: round.startPrice,
            startTime: round.startTime,
            endTime: round.endTime
          });
        }
      } else {
        // Broadcast upcoming round
        if (this.io) {
          this.io.emit('round_created', {
            roundNumber: round.roundNumber,
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

  // Ensure there's always one upcoming round
  async ensureUpcomingRound() {
    try {
      const upcomingRound = await Round.findOne({
        where: { status: 'upcoming' },
        order: [['startTime', 'ASC']]
      });

      if (!upcomingRound) {
        console.log('📊 Creating upcoming round...');
        await this.createNewRound(false);
      } else {
        console.log(`✅ Upcoming round #${upcomingRound.roundNumber} exists`);
      }
    } catch (error) {
      console.error('❌ Error ensuring upcoming round:', error.message);
    }
  }

  // Check and update rounds
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

      // 2. Lock active rounds (30 seconds before end)
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

  // Start a round
  async startRound(round) {
    try {
      const startPrice = priceService.getPrice();

      await round.update({
        status: 'active',
        startPrice
      });

      this.currentRound = round;

      console.log(`🟢 Round #${round.roundNumber} STARTED at $${startPrice.toLocaleString()}`);

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_start', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          startTime: round.startTime,
          endTime: round.endTime
        });
      }

      // Create next upcoming round
      await this.ensureUpcomingRound();

    } catch (error) {
      console.error('❌ Error starting round:', error.message);
    }
  }

  // Lock a round (no more bets)
  async lockRound(round) {
    try {
      await round.update({ status: 'locked' });

      console.log(`🔒 Round #${round.roundNumber} LOCKED (betting closed)`);

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_lock', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          message: 'Betting closed - Round ending soon'
        });
      }

    } catch (error) {
      console.error('❌ Error locking round:', error.message);
    }
  }

  // End a round and process results
  async endRound(round) {
    const transaction = await sequelize.transaction();

    try {
      const endPrice = priceService.getPrice();
      const startPrice = parseFloat(round.startPrice);

      // Determine result
      let result;
      const priceDiff = endPrice - startPrice;
      
      if (Math.abs(priceDiff) < 0.01) {
        // Less than $0.01 difference = tie
        result = 'tie';
      } else if (priceDiff > 0) {
        result = 'up';
      } else {
        result = 'down';
      }

      // Update round
      await round.update({
        status: 'completed',
        endPrice,
        result
      }, { transaction });

      console.log(`🏁 Round #${round.roundNumber} ENDED`);
      console.log(`   Start: $${startPrice.toLocaleString()} | End: $${endPrice.toLocaleString()}`);
      console.log(`   Change: ${priceDiff > 0 ? '+' : ''}$${priceDiff.toFixed(2)} (${((priceDiff / startPrice) * 100).toFixed(2)}%)`);
      console.log(`   Result: ${result.toUpperCase()}`);

      // Process all bets for this round
      await this.processBets(round, result, transaction);

      await transaction.commit();

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_end', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice,
          endPrice,
          result,
          priceChange: priceDiff
        });
      }

      // Ensure next round exists
      await this.ensureUpcomingRound();

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error ending round:', error.message);

      // Mark round as cancelled on error
      try {
        await round.update({ status: 'cancelled' });
      } catch (updateError) {
        console.error('❌ Failed to mark round as cancelled:', updateError.message);
      }
    }
  }

  // Process all bets for a round
  async processBets(round, result, transaction) {
    try {
      // Get all bets for this round
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

      // Handle tie - refund everyone
      if (result === 'tie') {
        await this.handleTie(round, bets, transaction);
        return;
      }

      // Separate winners and losers
      const winners = bets.filter(bet => bet.prediction === result);
      const losers = bets.filter(bet => bet.prediction !== result);

      console.log(`   Winners: ${winners.length} | Losers: ${losers.length}`);

      // If no winners, refund everyone
      if (winners.length === 0) {
        console.log('   🔄 No winners - Refunding all bets');
        await this.handleTie(round, bets, transaction);
        return;
      }

      // If no losers, refund everyone
      if (losers.length === 0) {
        console.log('   🔄 No losers - Refunding all bets');
        await this.handleTie(round, bets, transaction);
        return;
      }

      // Calculate pools
      const totalWinningStakes = winners.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
      const totalLosingStakes = losers.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

      const platformCut = calculatePlatformCut(totalLosingStakes); // 30%
      const prizePool = calculatePrizePool(totalLosingStakes); // 70%

      // Update round
      await round.update({
        platformCut: roundToTwo(platformCut),
        prizePool: roundToTwo(prizePool),
        isProcessed: true
      }, { transaction });

      console.log(`   💰 Losing Pool: ₦${totalLosingStakes.toLocaleString()}`);
      console.log(`   🏦 Platform Cut (30%): ₦${platformCut.toLocaleString()}`);
      console.log(`   🎁 Prize Pool (70%): ₦${prizePool.toLocaleString()}`);

      // Process winners
      for (const bet of winners) {
        const payout = calculateWinnerPayout(
          parseFloat(bet.stakeAmount),
          totalWinningStakes,
          prizePool
        );

        const profit = calculateProfit(payout, parseFloat(bet.totalAmount));

        // Update bet
        await bet.update({
          result: 'win',
          payout: roundToTwo(payout),
          profit: roundToTwo(profit),
          isPaid: true
        }, { transaction });

        // Get wallet
        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const balanceBefore = parseFloat(wallet.nairaBalance);

        // Update wallet
        await wallet.update({
          nairaBalance: balanceBefore + payout,
          lockedBalance: parseFloat(wallet.lockedBalance) - parseFloat(bet.stakeAmount),
          totalWon: parseFloat(wallet.totalWon) + payout
        }, { transaction });

        // Create transaction record
        await Transaction.create({
          userId: bet.userId,
          type: 'bet_win',
          method: 'internal',
          amount: payout,
          status: 'completed',
          description: `Won ₦${payout.toLocaleString()} in Round #${round.roundNumber}`,
          metadata: { 
            betId: bet.id, 
            roundId: round.id,
            profit: roundToTwo(profit)
          },
          balanceBefore,
          balanceAfter: balanceBefore + payout
        }, { transaction });

        console.log(`   ✅ ${bet.user.username}: Won ₦${payout.toLocaleString()} (Profit: ₦${profit.toLocaleString()})`);
      }

      // Process losers
      for (const bet of losers) {
        await bet.update({
          result: 'loss',
          payout: 0,
          profit: -parseFloat(bet.totalAmount),
          isPaid: true
        }, { transaction });

        // Get wallet
        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        // Update wallet
        await wallet.update({
          lockedBalance: parseFloat(wallet.lockedBalance) - parseFloat(bet.stakeAmount),
          totalLost: parseFloat(wallet.totalLost) + parseFloat(bet.totalAmount)
        }, { transaction });

        // Create transaction record
        await Transaction.create({
          userId: bet.userId,
          type: 'bet_loss',
          method: 'internal',
          amount: parseFloat(bet.totalAmount),
          status: 'completed',
          description: `Lost ₦${parseFloat(bet.totalAmount).toLocaleString()} in Round #${round.roundNumber}`,
          metadata: { betId: bet.id, roundId: round.id }
        }, { transaction });

        console.log(`   ❌ ${bet.user.username}: Lost ₦${parseFloat(bet.totalAmount).toLocaleString()}`);
      }

      console.log(`   ✅ Round #${round.roundNumber} processing complete`);

    } catch (error) {
      console.error('❌ Error processing bets:', error.message);
      throw error;
    }
  }

  // Handle tie scenario - refund all bets
  async handleTie(round, bets, transaction) {
    console.log('   🔄 TIE - Refunding all bets');

    for (const bet of bets) {
      const refundAmount = parseFloat(bet.totalAmount);

      await bet.update({
        result: 'refund',
        payout: refundAmount,
        profit: 0,
        isPaid: true
      }, { transaction });

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const balanceBefore = parseFloat(wallet.nairaBalance);

      await wallet.update({
        nairaBalance: balanceBefore + refundAmount,
        lockedBalance: parseFloat(wallet.lockedBalance) - parseFloat(bet.stakeAmount)
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'refund',
        method: 'internal',
        amount: refundAmount,
        status: 'completed',
        description: `Refund for Round #${round.roundNumber} (TIE)`,
        metadata: { betId: bet.id, roundId: round.id },
        balanceBefore,
        balanceAfter: balanceBefore + refundAmount
      }, { transaction });

      console.log(`   🔄 ${bet.user?.username || 'User'}: Refunded ₦${refundAmount.toLocaleString()}`);
    }

    await round.update({ isProcessed: true }, { transaction });
  }

  // Get current active round
  async getCurrentRound() {
    return await Round.findOne({
      where: {
        status: {
          [Op.in]: ['active', 'locked']
        }
      },
      order: [['startTime', 'DESC']]
    });
  }

  // Get upcoming round
  async getUpcomingRound() {
    return await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });
  }

  // Cleanup on shutdown
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('🎮 Round manager stopped');
    }
  }
}

// Export singleton instance
const roundService = new RoundService();
module.exports = roundService;
