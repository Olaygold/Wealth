
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
    
    // ✅ CACHE
    this.cachedActiveRound = null;
    this.cachedLockedRound = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5000;
    
    // ✅ ROUND DURATIONS
    this.BETTING_DURATION = parseInt(process.env.BETTING_DURATION_MINUTES) || 5;
    this.LOCKED_DURATION = parseInt(process.env.LOCKED_DURATION_MINUTES) || 5;
    this.TOTAL_ROUND_DURATION = this.BETTING_DURATION + this.LOCKED_DURATION;
    
    // 🔒 PREVENT DUPLICATE PROCESSING
    this.processingRounds = new Set();
    this.creatingRound = false; // Prevent concurrent round creation
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
      }, 10000);

      console.log('✅ Round Manager started successfully');
    } catch (error) {
      console.error('❌ Round Manager startup error:', error.message);
    }
  }

  // ==================== INITIALIZE ROUNDS ====================
  async initializeRounds() {
    try {
      console.log('🔄 Initializing round system...');
      
      const now = new Date();
      
      // Clean up any orphaned rounds
      await this.cleanupOrphanedRounds();
      
      // Get current system state
      const activeRound = await Round.findOne({
        where: { status: 'active' },
        order: [['roundNumber', 'DESC']]
      });

      const lockedRound = await Round.findOne({
        where: { status: 'locked' },
        order: [['roundNumber', 'DESC']]
      });

      const upcomingRound = await Round.findOne({
        where: { status: 'upcoming' },
        order: [['roundNumber', 'ASC']]
      });

      console.log(`📊 Current State:`);
      console.log(`   Active: ${activeRound ? `#${activeRound.roundNumber}` : 'NONE'}`);
      console.log(`   Locked: ${lockedRound ? `#${lockedRound.roundNumber}` : 'NONE'}`);
      console.log(`   Upcoming: ${upcomingRound ? `#${upcomingRound.roundNumber}` : 'NONE'}`);

      // ✅ Process overdue rounds FIRST
      if (lockedRound && now > new Date(lockedRound.endTime)) {
        console.log('⚠️ Locked round overdue, completing now...');
        await this.endRound(lockedRound);
      }

      if (activeRound && now > new Date(activeRound.lockTime)) {
        console.log('⚠️ Active round overdue, locking now...');
        await this.lockRound(activeRound);
      }

      // ✅ Re-check state after transitions
      const currentActive = await Round.findOne({
        where: { status: 'active' },
        order: [['roundNumber', 'DESC']]
      });

      const currentLocked = await Round.findOne({
        where: { status: 'locked' },
        order: [['roundNumber', 'DESC']]
      });

      // ✅ Ensure we have an active round
      if (!currentActive) {
        console.log('📊 No active round found. Creating first round...');
        await this.createNewRound(true);
      } else {
        this.currentRound = currentActive;
        this.cachedActiveRound = currentActive;
        console.log(`✅ Active round #${currentActive.roundNumber} ready`);
      }

      if (currentLocked) {
        this.cachedLockedRound = currentLocked;
        console.log(`🔒 Locked round #${currentLocked.roundNumber} waiting for result`);
      }

      // ✅ Ensure upcoming round exists
      const hasUpcoming = await Round.findOne({
        where: { status: 'upcoming' }
      });

      if (!hasUpcoming) {
        console.log('📅 Creating upcoming round...');
        await this.ensureUpcomingRound();
      }

      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log('✅ Round system initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing rounds:', error);
      try {
        await this.createNewRound(true);
      } catch (createError) {
        console.error('❌ Failed to create initial round:', createError);
      }
    }
  }

  // ==================== CLEANUP ORPHANED ROUNDS ====================
  async cleanupOrphanedRounds() {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      // Cancel stuck locked rounds
      const stuckLocked = await Round.update(
        { status: 'cancelled', result: 'cancelled', isProcessed: true },
        {
          where: {
            status: 'locked',
            endTime: { [Op.lt]: fifteenMinutesAgo }
          }
        }
      );

      // Cancel stuck active rounds
      const stuckActive = await Round.update(
        { status: 'cancelled', result: 'cancelled', isProcessed: true },
        {
          where: {
            status: 'active',
            lockTime: { [Op.lt]: fifteenMinutesAgo }
          }
        }
      );

      if (stuckLocked[0] > 0 || stuckActive[0] > 0) {
        console.log(`🧹 Cleaned up ${stuckLocked[0]} stuck locked, ${stuckActive[0]} stuck active rounds`);
      }
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }

  // ==================== CREATE NEW ROUND (FIXED - NO MORE DUPLICATES) ====================
  async createNewRound(startImmediately = false) {
    // 🔒 PREVENT CONCURRENT CREATION
    if (this.creatingRound) {
      console.log('⏳ Round creation already in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return await this.getActiveRound();
    }

    this.creatingRound = true;
    const transaction = await sequelize.transaction();
    
    try {
      const now = new Date();
      
      // 🔥 CRITICAL FIX: Get last valid round from completed/active/locked ONLY
      const lastValidRound = await Round.findOne({
        where: {
          status: {
            [Op.in]: ['completed', 'active', 'locked']
          }
        },
        order: [['roundNumber', 'DESC']],
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      const nextRoundNumber = lastValidRound ? lastValidRound.roundNumber + 1 : 1;

      console.log(`📝 Creating round #${nextRoundNumber} (last valid: #${lastValidRound?.roundNumber || 'none'})`);

      // ✅ Check if round already exists
      const existing = await Round.findOne({
        where: { roundNumber: nextRoundNumber },
        transaction
      });

      if (existing) {
        console.log(`⚠️ Round #${nextRoundNumber} already exists (${existing.status}), using it`);
        await transaction.rollback();
        this.creatingRound = false;
        
        // If it's upcoming and we need it active, start it
        if (existing.status === 'upcoming' && startImmediately) {
          const startPrice = priceService.getPrice();
          await existing.update({
            status: 'active',
            startPrice: startPrice,
            startTime: now
          });
          
          this.currentRound = existing;
          this.cachedActiveRound = existing;
          this.cacheExpiry = Date.now() + this.CACHE_DURATION;
          
          if (this.io) {
            this.io.emit('round_start', {
              roundId: existing.id,
              roundNumber: existing.roundNumber,
              startPrice: startPrice,
              startTime: existing.startTime,
              lockTime: existing.lockTime,
              endTime: existing.endTime
            });
          }
        }
        
        return existing;
      }

      let startTime, lockTime, endTime;

      if (startImmediately) {
        startTime = now;
        lockTime = new Date(now.getTime() + (this.BETTING_DURATION * 60 * 1000));
        endTime = new Date(now.getTime() + (this.TOTAL_ROUND_DURATION * 60 * 1000));
      } else {
        const currentActive = await Round.findOne({
          where: { status: 'active' },
          order: [['startTime', 'DESC']],
          transaction
        });
        
        if (currentActive) {
          startTime = new Date(currentActive.lockTime.getTime() + 1000);
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
      }, { transaction });

      await transaction.commit();
      this.creatingRound = false;

      console.log(`✅ Created round #${round.roundNumber} (${round.status})`);
      console.log(`   Start: ${startTime.toLocaleTimeString()}`);
      console.log(`   Lock: ${lockTime.toLocaleTimeString()}`);
      console.log(`   End: ${endTime.toLocaleTimeString()}`);

      if (startImmediately) {
        this.currentRound = round;
        this.cachedActiveRound = round;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        
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
      await transaction.rollback();
      this.creatingRound = false;
      console.error('❌ Error creating round:', error.message);
      
      // If it's a duplicate error, fetch existing
      if (error.name === 'SequelizeUniqueConstraintError') {
        const existing = await Round.findOne({
          where: {
            status: {
              [Op.in]: ['active', 'upcoming']
            }
          },
          order: [['roundNumber', 'DESC']]
        });
        
        if (existing) {
          console.log(`✅ Using existing round #${existing.roundNumber}`);
          return existing;
        }
      }
      
      throw error;
    }
  }

  // ==================== ENSURE UPCOMING ROUND ====================
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
      console.error('❌ Error ensuring upcoming round:', error);
    }
  }

  // ==================== CHECK AND UPDATE ROUNDS ====================
  async checkAndUpdateRounds() {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.lastCheckTime = new Date();
    const now = new Date();

    try {
      // ✅ Get rounds that need action
      const roundsNeedingAction = await Round.findAll({
        where: {
          [Op.or]: [
            { status: 'locked', endTime: { [Op.lte]: now } },
            { status: 'active', lockTime: { [Op.lte]: now } },
            { status: 'upcoming', startTime: { [Op.lte]: now } }
          ]
        },
        order: [
          ['status', 'DESC'], // locked first, then active, then upcoming
          ['roundNumber', 'ASC']
        ]
      });

      // ✅ Process rounds IN SEQUENCE
      for (const round of roundsNeedingAction) {
        const roundKey = `${round.id}-${round.status}`;
        
        if (this.processingRounds.has(roundKey)) {
          continue;
        }

        this.processingRounds.add(roundKey);
        
        try {
          if (round.status === 'locked' && new Date(round.endTime) <= now) {
            console.log(`🔄 Completing Round #${round.roundNumber}...`);
            await this.endRound(round);
          } 
          else if (round.status === 'active' && new Date(round.lockTime) <= now) {
            console.log(`🔄 Locking Round #${round.roundNumber}...`);
            await this.lockRound(round);
          } 
          else if (round.status === 'upcoming' && new Date(round.startTime) <= now) {
            console.log(`🔄 Starting Round #${round.roundNumber}...`);
            await this.startRound(round);
          }
        } finally {
          this.processingRounds.delete(roundKey);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ✅ BOT CHECK
      const activeRound = await this.getActiveRound();
      if (activeRound && activeRound.status === 'active') {
        await botService.checkAndPlaceBets(activeRound, this.io);
      }

    } catch (error) {
      console.error('❌ Error in round check cycle:', error.message);
    } finally {
      this.isChecking = false;
    }
  }

  // ==================== START ROUND ====================
  async startRound(round) {
    const transaction = await sequelize.transaction();
    
    try {
      const freshRound = await Round.findByPk(round.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!freshRound || freshRound.status !== 'upcoming') {
        await transaction.rollback();
        return;
      }

      const startPrice = priceService.getPrice();

      await freshRound.update({ 
        status: 'active', 
        startPrice,
        startTime: new Date()
      }, { transaction });

      await transaction.commit();

      this.currentRound = freshRound;
      this.cachedActiveRound = freshRound;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`🟢 Round #${freshRound.roundNumber} STARTED at $${startPrice.toLocaleString()}`);

      if (this.io) {
        this.io.emit('round_start', {
          roundId: freshRound.id,
          roundNumber: freshRound.roundNumber,
          startPrice,
          startTime: freshRound.startTime,
          lockTime: freshRound.lockTime,
          endTime: freshRound.endTime
        });
      }

      await this.ensureUpcomingRound();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error starting round:', error.message);
    }
  }

  // ==================== LOCK ROUND (BULLETPROOF VERSION) ====================
  async lockRound(round) {
    const transaction = await sequelize.transaction();
    
    try {
      // ✅ Re-fetch with lock
      const freshRound = await Round.findByPk(round.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!freshRound || freshRound.status !== 'active') {
        await transaction.rollback();
        return;
      }

      const lockPrice = priceService.getPrice();
      
      console.log(`🔒 LOCKING Round #${freshRound.roundNumber}...`);
      
      // ✅ STEP 1: Lock current round
      await freshRound.update({ 
        status: 'locked',
        lockPrice: lockPrice
      }, { transaction });

      console.log(`   ✅ Round #${freshRound.roundNumber} locked at $${lockPrice.toLocaleString()}`);

      // ✅ STEP 2: Find specific upcoming round
      const upcomingRound = await Round.findOne({
        where: { 
          status: 'upcoming',
          roundNumber: freshRound.roundNumber + 1
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!upcomingRound) {
        console.log(`⚠️ No upcoming round #${freshRound.roundNumber + 1}, will create after commit`);
        await transaction.commit();
        
        // Create new round outside transaction
        await this.createNewRound(true);
        return;
      }

      // ✅ STEP 3: Start upcoming round
      const startPrice = priceService.getPrice();
      const now = new Date();
      
      await upcomingRound.update({ 
        status: 'active',
        startPrice: startPrice,
        startTime: now
      }, { transaction });

      console.log(`🚀 Round #${upcomingRound.roundNumber} started at $${startPrice.toLocaleString()}`);

      // ✅ STEP 4: Create next upcoming round
      const nextRoundNumber = upcomingRound.roundNumber + 1;
      
      const existingNext = await Round.findOne({
        where: { roundNumber: nextRoundNumber },
        transaction
      });

      if (!existingNext) {
        const nextStartTime = new Date(upcomingRound.lockTime.getTime() + 1000);
        const nextLockTime = new Date(nextStartTime.getTime() + (this.BETTING_DURATION * 60 * 1000));
        const nextEndTime = new Date(nextStartTime.getTime() + (this.TOTAL_ROUND_DURATION * 60 * 1000));

        await Round.create({
          roundNumber: nextRoundNumber,
          status: 'upcoming',
          startTime: nextStartTime,
          lockTime: nextLockTime,
          endTime: nextEndTime,
          startPrice: null
        }, { transaction });

        console.log(`📅 Created upcoming Round #${nextRoundNumber}`);
      }

      // ✅ COMMIT
      await transaction.commit();

      // ✅ Update cache
      this.cachedActiveRound = upcomingRound;
      this.cachedLockedRound = freshRound;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      this.currentRound = upcomingRound;

      // ✅ Emit events
      if (this.io) {
        this.io.emit('round_locked', {
          roundId: freshRound.id,
          roundNumber: freshRound.roundNumber,
          lockPrice: lockPrice,
          startPrice: freshRound.startPrice,
          endTime: freshRound.endTime
        });

        this.io.emit('round_start', {
          roundId: upcomingRound.id,
          roundNumber: upcomingRound.roundNumber,
          startPrice: startPrice,
          startTime: upcomingRound.startTime,
          lockTime: upcomingRound.lockTime,
          endTime: upcomingRound.endTime
        });
      }

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error locking round:', error.message);
      
      // Emergency recovery
      try {
        const hasActive = await Round.findOne({ where: { status: 'active' } });
        if (!hasActive) {
          await this.createNewRound(true);
        }
      } catch (emergencyError) {
        console.error('❌ Emergency recovery failed:', emergencyError.message);
      }
    }
  }

  // ==================== END ROUND ====================
  async endRound(round) {
    const transaction = await sequelize.transaction();

    try {
      const freshRound = await Round.findByPk(round.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!freshRound || freshRound.status !== 'locked') {
        await transaction.rollback();
        return;
      }

      console.log(`🏁 ENDING Round #${freshRound.roundNumber}...`);
      
      const endPrice = priceService.getPrice();
      const startPrice = parseFloat(freshRound.startPrice);

      let result;
      const priceDiff = endPrice - startPrice;
      const percentChange = (priceDiff / startPrice) * 100;

      if (endPrice === startPrice) {
        result = 'tie';
      } else if (priceDiff > 0) {
        result = 'up';
      } else {
        result = 'down';
      }

      await freshRound.update({ 
        status: 'completed', 
        endPrice, 
        result 
      }, { transaction });

      console.log(`   💰 Start: $${startPrice.toLocaleString()} → End: $${endPrice.toLocaleString()}`);
      console.log(`   📊 Change: ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${percentChange.toFixed(3)}%)`);
      console.log(`   🎯 Result: ${result.toUpperCase()}`);

      await this.processBets(freshRound, result, transaction);

      await transaction.commit();
      console.log(`   ✅ Round #${freshRound.roundNumber} completed`);

      this.cachedLockedRound = null;
      botService.cleanupRound(freshRound.id);

      if (this.io) {
        this.io.emit('round_completed', {
          roundId: freshRound.id,
          roundNumber: freshRound.roundNumber,
          startPrice,
          endPrice,
          result,
          priceChange: priceDiff,
          percentChange: percentChange.toFixed(3)
        });
      }

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error ending round:', error.message);
      
      try {
        await Round.update(
          { status: 'cancelled' },
          { where: { id: round.id } }
        );
      } catch (updateError) {
        console.error('❌ Failed to mark round as cancelled');
      }
    }
  }

  // ==================== GET ACTIVE ROUND ====================
  async getActiveRound() {
    if (this.cachedActiveRound && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      if (this.cachedActiveRound.status === 'active') {
        return this.cachedActiveRound;
      }
    }

    const round = await Round.findOne({
      where: { status: 'active' },
      order: [['startTime', 'DESC']]
    });

    if (round) {
      this.cachedActiveRound = round;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    }

    return round;
  }

  async getLockedRound() {
    const round = await Round.findOne({
      where: { status: 'locked' },
      order: [['lockTime', 'DESC']]
    });

    return round;
  }

  async getPreviousRounds(limit = 3) {
    const rounds = await Round.findAll({
      where: { status: 'completed' },
      order: [['endTime', 'DESC']],
      limit: limit
    });

    return rounds;
  }

  async getUpcomingRound() {
    return await Round.findOne({
      where: { status: 'upcoming' },
      order: [['startTime', 'ASC']]
    });
  }

  async getAllRoundsData() {
    const [activeRound, lockedRound, previousRounds, upcomingRound] = await Promise.all([
      this.getActiveRound(),
      this.getLockedRound(),
      this.getPreviousRounds(3),
      this.getUpcomingRound()
    ]);

    return {
      activeRound,
      lockedRound,
      previousRounds,
      upcomingRound
    };
  }

  // ==================== ADMIN FUNCTIONS ====================
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

  // ==================== PROCESS BETS ====================
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

    } catch (error) {
      console.error('❌ Error processing bets:', error);
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
    return await this.getActiveRound();
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
