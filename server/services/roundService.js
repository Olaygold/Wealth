
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
    this.nextRound = null;
  }

  // Start round manager
  async startRoundManager(io) {
    this.io = io;
    console.log('🎮 Starting Round Manager...');

    // Create initial rounds
    await this.initializeRounds();

    // Schedule round checks every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      await this.checkAndUpdateRounds();
    });

    console.log('✅ Round Manager started successfully');
  }

  // Initialize rounds on server start
  async initializeRounds() {
    try {
      // Wait a bit for database to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for active or locked rounds
      const activeRound = await Round.findOne({
        where: {
          status: {
            [Op.in]: ['active', 'locked']
          }
        },
        order: [['startTime', 'DESC']]
      });

      if (!activeRound) {
        console.log('📊 No active round found. Creating first round...');
        await this.createNewRound();
      } else {
        this.currentRound = activeRound;
        console.log(`📊 Loaded existing round #${activeRound.roundNumber} (${activeRound.status})`);
      }

      // Ensure we have exactly ONE upcoming round
      await this.ensureNextRound();

    } catch (error) {
      console.error('❌ Error initializing rounds:', error.message);
      console.log('⏳ Will retry creating round on next check...');
    }
  }

  // Create new round
  async createNewRound() {
    try {
      const now = new Date();
      const roundDuration = parseInt(process.env.ROUND_DURATION_MINUTES) || 5;
      
      // Get last round number
      const lastRound = await Round.findOne({
        order: [['roundNumber', 'DESC']]
      });
      
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

      // Calculate times
      const startTime = new Date(now.getTime() + 30000); // Start in 30 seconds
      const lockTime = new Date(startTime.getTime() + ((roundDuration * 60000) - 30000)); // Lock 30s before end
      const endTime = new Date(startTime.getTime() + (roundDuration * 60000));

      const round = await Round.create({
        roundNumber: nextRoundNumber,
        status: 'upcoming',
        startTime,
        lockTime,
        endTime
      });

      console.log(`✅ Created round #${round.roundNumber}`);
      console.log(`   Start: ${startTime.toLocaleTimeString()}`);
      console.log(`   End: ${endTime.toLocaleTimeString()}`);

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_created', {
          roundNumber: round.roundNumber,
          startTime,
          endTime
        });
      }

      return round;
    } catch (error) {
      console.error('❌ Error creating round:', error.message);
      throw error;
    }
  }

  // Ensure next round exists (ONLY ONE upcoming round)
  async ensureNextRound() {
    try {
      // Count how many upcoming rounds exist
      const upcomingCount = await Round.count({
        where: { status: 'upcoming' }
      });

      // Only create ONE upcoming round if none exists
      if (upcomingCount === 0) {
        console.log('📊 Creating next upcoming round...');
        await this.createNewRound();
      } else if (upcomingCount === 1) {
        console.log('✅ One upcoming round already exists (buffer ready)');
      } else {
        console.log(`ℹ️ ${upcomingCount} upcoming rounds exist`);
      }
    } catch (error) {
      console.error('❌ Error ensuring next round:', error.message);
    }
  }

  // Check and update rounds
  async checkAndUpdateRounds() {
    const now = new Date();

    try {
      // Check for rounds that should start
      const roundsToStart = await Round.findAll({
        where: {
          status: 'upcoming',
          startTime: { [Op.lte]: now }
        }
      });

      for (const round of roundsToStart) {
        await this.startRound(round);
      }

      // Check for rounds that should lock
      const roundsToLock = await Round.findAll({
        where: {
          status: 'active',
          lockTime: { [Op.lte]: now }
        }
      });

      for (const round of roundsToLock) {
        await this.lockRound(round);
      }

      // Check for rounds that should end
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
      console.error('❌ Error checking rounds:', error.message);
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

      console.log(`🟢 Round #${round.roundNumber} STARTED at $${startPrice}`);

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

      // Create next upcoming round IMMEDIATELY when this one starts
      await this.ensureNextRound();

    } catch (error) {
      console.error('❌ Error starting round:', error.message);
    }
  }

  // Lock a round (no more bets)
  async lockRound(round) {
    try {
      await round.update({ status: 'locked' });

      console.log(`🔒 Round #${round.roundNumber} LOCKED (no more bets)`);

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_lock', {
          roundId: round.id,
          roundNumber: round.roundNumber
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

      // Determine result
      let result;
      if (endPrice > round.startPrice) {
        result = 'up';
      } else if (endPrice < round.startPrice) {
        result = 'down';
      } else {
        result = 'tie';
      }

      // Update round
      await round.update({
        status: 'completed',
        endPrice,
        result
      }, { transaction });

      console.log(`🏁 Round #${round.roundNumber} ENDED`);
      console.log(`   Start: $${round.startPrice} | End: $${endPrice} | Result: ${result.toUpperCase()}`);

      // Process bets
      await this.processBets(round, result, transaction);

      await transaction.commit();

      // Broadcast to clients
      if (this.io) {
        this.io.emit('round_end', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          startPrice: round.startPrice,
          endPrice,
          result
        });
      }

      // Make sure we have the next round ready
      await this.ensureNextRound();

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error ending round:', error.message);

      // Mark round as failed
      await round.update({ status: 'cancelled' });
    }
  }

  // Process all bets for a round
  async processBets(round, result, transaction) {
    try {
      // Get all bets for this round
      const bets = await Bet.findAll({
        where: { roundId: round.id },
        include: [{ model: User, as: 'user' }]
      });

      if (bets.length === 0) {
        console.log('   No bets placed in this round');
        return;
      }

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
        await this.handleNoWinners(round, bets, transaction);
        return;
      }

      // If no losers, refund everyone
      if (losers.length === 0) {
        await this.handleNoLosers(round, bets, transaction);
        return;
      }

      // Calculate pools
      const totalWinningStakes = winners.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);
      const totalLosingStakes = losers.reduce((sum, bet) => sum + parseFloat(bet.stakeAmount), 0);

      const platformCut = calculatePlatformCut(totalLosingStakes);
      const prizePool = calculatePrizePool(totalLosingStakes);

      // Update round with pool info
      await round.update({
        platformCut: roundToTwo(platformCut),
        prizePool: roundToTwo(prizePool),
        isProcessed: true
      }, { transaction });

      console.log(`   Losing Pool: ₦${totalLosingStakes.toFixed(2)}`);
      console.log(`   Platform Cut (30%): ₦${platformCut.toFixed(2)}`);
      console.log(`   Prize Pool (70%): ₦${prizePool.toFixed(2)}`);

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

        // Update wallet
        const wallet = await Wallet.findOne({
          where: { userId: bet.userId }
        });

        await wallet.update({
          nairaBalance: parseFloat(wallet.nairaBalance) + payout,
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
          description: `Won ₦${payout.toFixed(2)} in Round #${round.roundNumber}`,
          metadata: { betId: bet.id, roundId: round.id },
          balanceBefore: wallet.nairaBalance,
          balanceAfter: parseFloat(wallet.nairaBalance) + payout
        }, { transaction });

        console.log(`   ✅ ${bet.user.username}: Won ₦${payout.toFixed(2)} (Profit: ₦${profit.toFixed(2)})`);
      }

      // Process losers
      for (const bet of losers) {
        await bet.update({
          result: 'loss',
          payout: 0,
          profit: -parseFloat(bet.totalAmount),
          isPaid: true
        }, { transaction });

        // Update wallet
        const wallet = await Wallet.findOne({
          where: { userId: bet.userId }
        });

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
          description: `Lost ₦${bet.totalAmount} in Round #${round.roundNumber}`,
          metadata: { betId: bet.id, roundId: round.id }
        }, { transaction });

        console.log(`   ❌ ${bet.user.username}: Lost ₦${bet.totalAmount}`);
      }

    } catch (error) {
      console.error('❌ Error processing bets:', error.message);
      throw error;
    }
  }

  // Handle tie scenario
  async handleTie(round, bets, transaction) {
    console.log('   🔄 TIE - Refunding all bets');

    for (const bet of bets) {
      await bet.update({
        result: 'refund',
        payout: parseFloat(bet.totalAmount),
        profit: 0,
        isPaid: true
      }, { transaction });

      const wallet = await Wallet.findOne({
        where: { userId: bet.userId }
      });

      await wallet.update({
        nairaBalance: parseFloat(wallet.nairaBalance) + parseFloat(bet.totalAmount),
        lockedBalance: parseFloat(wallet.lockedBalance) - parseFloat(bet.stakeAmount)
      }, { transaction });

      await Transaction.create({
        userId: bet.userId,
        type: 'refund',
        method: 'internal',
        amount: parseFloat(bet.totalAmount),
        status: 'completed',
        description: `Refund for Round #${round.roundNumber} (TIE)`,
        metadata: { betId: bet.id, roundId: round.id }
      }, { transaction });
    }
  }

  // Handle no winners scenario
  async handleNoWinners(round, bets, transaction) {
    console.log('   🔄 NO WINNERS - Refunding all bets');
    await this.handleTie(round, bets, transaction);
  }

  // Handle no losers scenario
  async handleNoLosers(round, bets, transaction) {
    console.log('   🔄 NO LOSERS - Refunding all bets');
    await this.handleTie(round, bets, transaction);
  }

  // Get current active round
  async getCurrentRound() {
    return await Round.findOne({
      where: {
        status: {
          [Op.in]: ['active', 'locked']
        }
      }
    });
  }

  // Get upcoming round
  async getUpcomingRound() {
    return await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });
  }
}

// Export singleton instance
const roundService = new RoundService();
module.exports = roundService;
