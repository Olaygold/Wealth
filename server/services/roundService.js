
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

// ==================== WALL-CLOCK HELPERS ====================

const getSlotStart = (timestamp, bettingMinutes) => {
  const ms = bettingMinutes * 60 * 1000;
  return Math.floor(timestamp / ms) * ms;
};

const getSlotEnd = (slotStart, bettingMinutes) => {
  return slotStart + bettingMinutes * 60 * 1000;
};

const getCurrentSlotStart = (bettingMinutes) => {
  return getSlotStart(Date.now(), bettingMinutes);
};

const getNextSlotStart = (bettingMinutes) => {
  const current = getCurrentSlotStart(bettingMinutes);
  return current + bettingMinutes * 60 * 1000;
};

const getSlotsBetween = (fromTs, toTs, bettingMinutes) => {
  const ms = bettingMinutes * 60 * 1000;
  const slots = [];
  let slot = Math.ceil(fromTs / ms) * ms;
  while (slot < toTs) {
    slots.push(slot);
    slot += ms;
  }
  return slots;
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
    this.creatingRound = false;
  }

  // ==================== START MANAGER ====================
  async startRoundManager(io) {
    this.io = io;
    console.log('🎮 Starting Round Manager (Wall-Clock Aligned)...');
    console.log(`   ⏱️  Betting Period : ${this.BETTING_DURATION} min`);
    console.log(`   🔒 Locked Period  : ${this.LOCKED_DURATION} min`);
    console.log(`   📊 Total Round    : ${this.TOTAL_ROUND_DURATION} min`);
    console.log(`   🕐 Slots align to every ${this.BETTING_DURATION} min on the clock`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.initializeRounds();

      // Check every 10 seconds
      this.checkInterval = setInterval(() => this.checkAndUpdateRounds(), 10000);

      console.log('✅ Round Manager started successfully');
    } catch (error) {
      console.error('❌ Round Manager startup error:', error.message);
    }
  }

  // ==================== INITIALIZE ====================
  async initializeRounds() {
    try {
      console.log('🔄 Initializing round system...');

      await this.cleanupStaleRounds();

      const now = Date.now();

      const activeRound = await Round.findOne({ where: { status: 'active' }, order: [['roundNumber', 'DESC']] });
      const lockedRound = await Round.findOne({ where: { status: 'locked' }, order: [['roundNumber', 'DESC']] });

      console.log(`   Active : ${activeRound ? `#${activeRound.roundNumber}` : 'NONE'}`);
      console.log(`   Locked : ${lockedRound ? `#${lockedRound.roundNumber}` : 'NONE'}`);

      if (lockedRound && now > new Date(lockedRound.endTime).getTime()) {
        console.log('⚠️  Overdue locked round – completing now...');
        await this.endRound(lockedRound);
      }

      if (activeRound && now > new Date(activeRound.lockTime).getTime()) {
        console.log('⚠️  Overdue active round – locking now...');
        await this.lockRound(activeRound);
      }

      const currentActive = await Round.findOne({ where: { status: 'active' }, order: [['roundNumber', 'DESC']] });

      if (!currentActive) {
        console.log('📊 No active round – aligning to wall-clock slot...');
        await this.alignAndCreateRounds();
      } else {
        this.currentRound = currentActive;
        this.cachedActiveRound = currentActive;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        console.log(`✅ Active round #${currentActive.roundNumber} is ready`);
        await this.ensureUpcomingExists();
      }

      const currentLocked = await Round.findOne({ where: { status: 'locked' }, order: [['roundNumber', 'DESC']] });
      if (currentLocked) {
        this.cachedLockedRound = currentLocked;
        console.log(`🔒 Locked round #${currentLocked.roundNumber} is waiting for result`);
      }

      console.log('✅ Round system initialized');
    } catch (error) {
      console.error('❌ Init error:', error.message);
      try { await this.alignAndCreateRounds(); } catch (e) { console.error('❌ Recovery failed:', e.message); }
    }
  }

  // ==================== ALIGN TO WALL CLOCK ====================
  async alignAndCreateRounds() {
    try {
      const now = Date.now();
      const bm = this.BETTING_DURATION;
      const lm = this.LOCKED_DURATION;
      const slotMs = bm * 60 * 1000;

      const slotStart = getSlotStart(now, bm);
      const slotLock = slotStart + slotMs;
      const slotEnd = slotLock + lm * 60 * 1000;

      const nextStart = slotLock;
      const nextLock = nextStart + slotMs;
      const nextEnd = nextLock + lm * 60 * 1000;

      console.log(`⏰ Wall-clock alignment:`);
      console.log(`   Current slot : ${new Date(slotStart).toLocaleTimeString()} – ${new Date(slotLock).toLocaleTimeString()}`);
      console.log(`   Next slot    : ${new Date(nextStart).toLocaleTimeString()} – ${new Date(nextLock).toLocaleTimeString()}`);

      const lastRound = await Round.findOne({
        where: { status: { [Op.in]: ['completed', 'active', 'locked', 'cancelled'] } },
        order: [['roundNumber', 'DESC']]
      });
      let nextNum = lastRound ? lastRound.roundNumber + 1 : 1;

      let activeRound = await Round.findOne({
        where: {
          status: { [Op.in]: ['active', 'upcoming'] },
          startTime: { [Op.lte]: new Date(slotLock) },
          lockTime: { [Op.gte]: new Date(now) }
        }
      });

      if (!activeRound) {
        const startPrice = priceService.getPrice();
        activeRound = await Round.create({
          roundNumber: nextNum++,
          status: 'active',
          startTime: new Date(slotStart),
          lockTime: new Date(slotLock),
          endTime: new Date(slotEnd),
          startPrice: startPrice
        });
        console.log(`✅ Created active round #${activeRound.roundNumber} (${new Date(slotStart).toLocaleTimeString()} – ${new Date(slotLock).toLocaleTimeString()})`);

        if (this.io) {
          this.io.emit('round_start', {
            roundId: activeRound.id,
            roundNumber: activeRound.roundNumber,
            startPrice,
            startTime: activeRound.startTime,
            lockTime: activeRound.lockTime,
            endTime: activeRound.endTime
          });
        }
      } else if (activeRound.status === 'upcoming') {
        const startPrice = priceService.getPrice();
        await activeRound.update({ status: 'active', startPrice, startTime: new Date(slotStart) });
        console.log(`✅ Promoted upcoming → active round #${activeRound.roundNumber}`);

        if (this.io) {
          this.io.emit('round_start', {
            roundId: activeRound.id,
            roundNumber: activeRound.roundNumber,
            startPrice,
            startTime: activeRound.startTime,
            lockTime: activeRound.lockTime,
            endTime: activeRound.endTime
          });
        }
      }

      this.currentRound = activeRound;
      this.cachedActiveRound = activeRound;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      let upcomingRound = await Round.findOne({ where: { status: 'upcoming' } });
      if (!upcomingRound) {
        upcomingRound = await Round.create({
          roundNumber: nextNum,
          status: 'upcoming',
          startTime: new Date(nextStart),
          lockTime: new Date(nextLock),
          endTime: new Date(nextEnd),
          startPrice: null
        });
        console.log(`📅 Created upcoming round #${upcomingRound.roundNumber} (${new Date(nextStart).toLocaleTimeString()})`);
      }
    } catch (error) {
      console.error('❌ alignAndCreateRounds error:', error.message);
      throw error;
    }
  }

  // ==================== CLEANUP STALE ROUNDS ====================
  async cleanupStaleRounds() {
    try {
      const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000);

      const [sl] = await Round.update(
        { status: 'cancelled', result: 'cancelled', isProcessed: true },
        { where: { status: 'locked', endTime: { [Op.lt]: fifteenAgo } } }
      );

      const [sa] = await Round.update(
        { status: 'cancelled', result: 'cancelled', isProcessed: true },
        { where: { status: 'active', lockTime: { [Op.lt]: fifteenAgo } } }
      );

      if (sl > 0 || sa > 0) {
        console.log(`🧹 Cleaned up ${sl} stuck-locked + ${sa} stuck-active rounds`);
      }
    } catch (error) {
      console.error('⚠️  Cleanup error:', error.message);
    }
  }

  // ==================== ENSURE UPCOMING EXISTS ====================
  async ensureUpcomingExists() {
    try {
      const upcoming = await Round.findOne({ where: { status: 'upcoming' } });
      if (upcoming) return;

      const bm = this.BETTING_DURATION;
      const lm = this.LOCKED_DURATION;

      const active = await Round.findOne({ where: { status: 'active' }, order: [['lockTime', 'DESC']] });

      let nextStart, nextLock, nextEnd;

      if (active) {
        nextStart = new Date(active.lockTime);
        nextLock = new Date(nextStart.getTime() + bm * 60 * 1000);
        nextEnd = new Date(nextStart.getTime() + (bm + lm) * 60 * 1000);
      } else {
        const slotMs = bm * 60 * 1000;
        nextStart = new Date(getNextSlotStart(bm));
        nextLock = new Date(nextStart.getTime() + slotMs);
        nextEnd = new Date(nextStart.getTime() + (bm + lm) * 60 * 1000);
      }

      const lastRound = await Round.findOne({
        where: { status: { [Op.in]: ['completed', 'active', 'locked', 'cancelled', 'upcoming'] } },
        order: [['roundNumber', 'DESC']]
      });
      const nextNum = lastRound ? lastRound.roundNumber + 1 : 1;

      await Round.create({
        roundNumber: nextNum,
        status: 'upcoming',
        startTime: nextStart,
        lockTime: nextLock,
        endTime: nextEnd,
        startPrice: null
      });

      console.log(`📅 Upcoming round #${nextNum} created (${nextStart.toLocaleTimeString()} → ${nextLock.toLocaleTimeString()})`);
    } catch (error) {
      console.error('❌ ensureUpcomingExists error:', error.message);
    }
  }

  // ==================== CHECK AND UPDATE ROUNDS ====================
  async checkAndUpdateRounds() {
    if (this.isChecking) return;

    this.isChecking = true;
    this.lastCheckTime = new Date();
    const now = new Date();

    try {
      const roundsNeedingAction = await Round.findAll({
        where: {
          [Op.or]: [
            { status: 'locked', endTime: { [Op.lte]: now } },
            { status: 'active', lockTime: { [Op.lte]: now } },
            { status: 'upcoming', startTime: { [Op.lte]: now } }
          ]
        },
        order: [
          ['status', 'DESC'],
          ['roundNumber', 'ASC']
        ]
      });

      for (const round of roundsNeedingAction) {
        const key = `${round.id}-${round.status}`;
        if (this.processingRounds.has(key)) continue;

        this.processingRounds.add(key);
        try {
          if (round.status === 'locked' && new Date(round.endTime) <= now) await this.endRound(round);
          else if (round.status === 'active' && new Date(round.lockTime) <= now) await this.lockRound(round);
          else if (round.status === 'upcoming' && new Date(round.startTime) <= now) await this.startRound(round);
        } finally {
          this.processingRounds.delete(key);
        }

        await new Promise(r => setTimeout(r, 100));
      }

      const activeRound = await this.getActiveRound();
      if (activeRound?.status === 'active') {
        await botService.checkAndPlaceBets(activeRound, this.io);
      }
    } catch (error) {
      console.error('❌ checkAndUpdateRounds error:', error.message);
    } finally {
      this.isChecking = false;
    }
  }

  // ==================== START ROUND (upcoming → active) ====================
  async startRound(round) {
    const t = await sequelize.transaction();
    try {
      const fresh = await Round.findByPk(round.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fresh || fresh.status !== 'upcoming') { await t.rollback(); return; }

      const startPrice = priceService.getPrice();
      await fresh.update({ status: 'active', startPrice, startTime: new Date() }, { transaction: t });
      await t.commit();

      this.currentRound = fresh;
      this.cachedActiveRound = fresh;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`🟢 Round #${fresh.roundNumber} STARTED at $${startPrice.toLocaleString()}`);

      if (this.io) {
        this.io.emit('round_start', {
          roundId: fresh.id,
          roundNumber: fresh.roundNumber,
          startPrice,
          startTime: fresh.startTime,
          lockTime: fresh.lockTime,
          endTime: fresh.endTime
        });
      }

      await this.ensureUpcomingExists();
    } catch (error) {
      await t.rollback();
      console.error('❌ startRound error:', error.message);
    }
  }

  // ==================== LOCK ROUND ====================
  async lockRound(round) {
    const t = await sequelize.transaction();
    try {
      const fresh = await Round.findByPk(round.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fresh || fresh.status !== 'active') { await t.rollback(); return; }

      const lockPrice = priceService.getPrice();
      console.log(`🔒 Locking Round #${fresh.roundNumber}...`);

      await fresh.update({ status: 'locked', lockPrice }, { transaction: t });

      const upcoming = await Round.findOne({
        where: {
          status: 'upcoming',
          roundNumber: fresh.roundNumber + 1
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!upcoming) {
        await t.commit();
        console.log('⚠️  No upcoming round found after lock – aligning now...');
        await this.alignAndCreateRounds();
        return;
      }

      const startPrice = priceService.getPrice();
      const now = new Date();

      const effectiveStart = now >= new Date(upcoming.startTime) ? now : new Date(upcoming.startTime);

      await upcoming.update({
        status: 'active',
        startPrice,
        startTime: effectiveStart
      }, { transaction: t });

      const nextNum = upcoming.roundNumber + 1;
      const existingNext = await Round.findOne({ where: { roundNumber: nextNum }, transaction: t });

      if (!existingNext) {
        const bm = this.BETTING_DURATION;
        const lm = this.LOCKED_DURATION;
        const nextStart = new Date(upcoming.lockTime);
        const nextLock = new Date(nextStart.getTime() + bm * 60 * 1000);
        const nextEnd = new Date(nextStart.getTime() + (bm + lm) * 60 * 1000);

        await Round.create({
          roundNumber: nextNum,
          status: 'upcoming',
          startTime: nextStart,
          lockTime: nextLock,
          endTime: nextEnd,
          startPrice: null
        }, { transaction: t });

        console.log(`📅 Created upcoming round #${nextNum} (${nextStart.toLocaleTimeString()})`);
      }

      await t.commit();

      this.cachedActiveRound = upcoming;
      this.cachedLockedRound = fresh;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      this.currentRound = upcoming;

      console.log(`🚀 Round #${upcoming.roundNumber} started at $${startPrice.toLocaleString()}`);

      if (this.io) {
        this.io.emit('round_locked', {
          roundId: fresh.id,
          roundNumber: fresh.roundNumber,
          lockPrice,
          startPrice: fresh.startPrice,
          endTime: fresh.endTime
        });
        this.io.emit('round_start', {
          roundId: upcoming.id,
          roundNumber: upcoming.roundNumber,
          startPrice,
          startTime: upcoming.startTime,
          lockTime: upcoming.lockTime,
          endTime: upcoming.endTime
        });
      }
    } catch (error) {
      await t.rollback();
      console.error('❌ lockRound error:', error.message);
      try {
        const hasActive = await Round.findOne({ where: { status: 'active' } });
        if (!hasActive) await this.alignAndCreateRounds();
      } catch (e) {
        console.error('❌ Emergency recovery failed:', e.message);
      }
    }
  }

  // ==================== END ROUND (✅ UPDATED WITH ADMIN MANIPULATION) ====================
  async endRound(round) {
    const t = await sequelize.transaction();
    try {
      const fresh = await Round.findByPk(round.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fresh || fresh.status !== 'locked') { await t.rollback(); return; }

      console.log(`🏁 ENDING Round #${fresh.roundNumber}...`);

      // ============================================================
      // ✅ CHECK: Admin forced result in DB or in priceService memory
      // DB check is primary — memory check is fallback
      // ============================================================
      const forcedResult = fresh.adminForcedResult ||
        priceService.getForcedResult(fresh.id);

      let endPrice;
      let result;
      const startPrice = parseFloat(fresh.startPrice);

      if (forcedResult && ['up', 'down'].includes(forcedResult)) {
        // ============================================================
        // ✅ ADMIN FORCED RESULT MODE
        // Generate convincing end price that matches forced result
        // Small random % change so it looks natural on chart
        // ============================================================
        if (forcedResult === 'up') {
          // End price 0.1% to 0.4% above start price
          const upPercent = 0.001 + Math.random() * 0.003;
          endPrice = Math.round(startPrice * (1 + upPercent) * 100) / 100;
        } else {
          // End price 0.1% to 0.4% below start price
          const downPercent = 0.001 + Math.random() * 0.003;
          endPrice = Math.round(startPrice * (1 - downPercent) * 100) / 100;
        }

        result = forcedResult;

        console.log(`   🎛️  ADMIN FORCED RESULT: ${result.toUpperCase()}`);
        console.log(`   📊 Start: $${startPrice} → Fake End: $${endPrice}`);

      } else {
        // ============================================================
        // ✅ NORMAL MODE
        // Use real market price for result determination
        // getRealPrice() always returns actual BTC price
        // even when override is active
        // ============================================================
        endPrice = priceService.getRealPrice();
        const priceDiff = endPrice - startPrice;
        result = priceDiff === 0 ? 'tie' : priceDiff > 0 ? 'up' : 'down';

        console.log(`   💰 $${startPrice.toLocaleString()} → $${endPrice.toLocaleString()}`);
      }

      const priceDiff = endPrice - startPrice;
      const pctChange = startPrice > 0 ? (priceDiff / startPrice) * 100 : 0;

      // ✅ Update round — clear all manipulation fields after completion
      await fresh.update({
        status: 'completed',
        endPrice,
        result,
        // ✅ Clear manipulation fields so DB is clean after round ends
        adminForcedResult: null,
        adminPriceEnabled: false,
        adminPriceOverride: null,
        adminPriceDrift: null
      }, { transaction: t });

      console.log(`   🎯 Result: ${result.toUpperCase()}`);

      // ✅ Process all bets with the determined result
      await this.processBets(fresh, result, t);
      await t.commit();

      // ✅ Clear price service override AFTER commit
      // Price returns to real BTC market price automatically
      priceService.clearAdminOverride(fresh.id);

      console.log(`   ✅ Round #${fresh.roundNumber} completed`);

      this.cachedLockedRound = null;
      botService.cleanupRound(fresh.id);

      if (this.io) {
        this.io.emit('round_completed', {
          roundId: fresh.id,
          roundNumber: fresh.roundNumber,
          startPrice,
          endPrice,
          result,
          priceChange: priceDiff,
          percentChange: pctChange.toFixed(3)
        });
      }
    } catch (error) {
      await t.rollback();
      console.error('❌ endRound error:', error.message);
      try {
        await Round.update({ status: 'cancelled' }, { where: { id: round.id } });
      } catch (e) {
        console.error('❌ Failed to mark round cancelled:', e.message);
      }
    }
  }

  // ==================== ADMIN: CANCEL ROUND ====================
  async cancelRound(roundId, reason = 'Admin cancelled') {
    const t = await sequelize.transaction();
    try {
      const round = await Round.findByPk(roundId, { transaction: t, lock: t.LOCK.UPDATE });

      if (!round) {
        await t.rollback();
        throw new Error('Round not found');
      }
      if (round.status === 'completed' || round.status === 'cancelled') {
        await t.rollback();
        throw new Error(`Round is already ${round.status}`);
      }

      console.log(`❌ Admin cancelling Round #${round.roundNumber} (${round.status}) – ${reason}`);

      const bets = await Bet.findAll({
        where: { roundId: round.id, result: 'pending' },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      console.log(`   📋 ${bets.length} pending bet(s) to refund`);

      for (const bet of bets) {
        const betAmount = parseFloat(bet.stakeAmount || bet.amount || 0);
        if (betAmount <= 0) continue;

        await bet.update({ result: 'refund', payout: betAmount, profit: 0, isPaid: true }, { transaction: t });

        if (bet.isBot) {
          console.log(`   🤖 Bot refund: ₦${betAmount}`);
          continue;
        }

        const wallet = await Wallet.findOne({
          where: { userId: bet.userId },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!wallet) {
          console.error(`   ❌ Wallet not found for user ${bet.userId}`);
          continue;
        }

        const currentBalance = parseFloat(wallet.nairaBalance || 0);
        const currentLocked = parseFloat(wallet.lockedBalance || 0);
        const newLocked = roundToTwo(Math.max(0, currentLocked - betAmount));

        await wallet.update({ lockedBalance: newLocked }, { transaction: t });

        await Transaction.create({
          userId: bet.userId,
          type: 'refund',
          method: 'internal',
          amount: betAmount,
          status: 'completed',
          description: `Refund ₦${betAmount.toLocaleString()} – Round #${round.roundNumber} cancelled (${reason})`,
          metadata: { betId: bet.id, roundId: round.id, reason, cancelledBy: 'admin' },
          balanceBefore: currentBalance,
          balanceAfter: currentBalance
        }, { transaction: t });

        console.log(`   🔄 User ${bet.userId}: refunded ₦${betAmount} (locked ${currentLocked} → ${newLocked})`);

        if (this.io) {
          this.io.to(String(bet.userId)).emit('bet_result', {
            betId: bet.id, result: 'refund',
            amount: betAmount, payout: betAmount, profit: 0,
            newBalance: currentBalance
          });
          this.io.to(String(bet.userId)).emit('balance_update', {
            nairaBalance: currentBalance,
            lockedBalance: newLocked
          });
        }
      }

      // ✅ Cancel the round + clear any manipulation fields
      await round.update({
        status: 'cancelled',
        result: 'cancelled',
        isProcessed: true,
        adminForcedResult: null,
        adminPriceEnabled: false,
        adminPriceOverride: null,
        adminPriceDrift: null
      }, { transaction: t });

      await t.commit();

      // ✅ Clear price override if this round was being manipulated
      priceService.clearAdminOverride(round.id);

      this.cachedActiveRound = null;
      this.cachedLockedRound = null;
      this.cacheExpiry = null;

      if (this.io) {
        this.io.emit('round_cancelled', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          reason,
          refundedBets: bets.filter(b => !b.isBot).length
        });
      }

      console.log(`✅ Round #${round.roundNumber} cancelled – waiting for next wall-clock slot`);

      await this._repairUpcomingSlots();

      const refunded = bets.filter(b => !b.isBot).length;
      return {
        success: true,
        message: `Round #${round.roundNumber} cancelled. ${refunded} user bet(s) refunded. Next round will start at the next ${this.BETTING_DURATION}-minute mark.`
      };
    } catch (error) {
      try { await t.rollback(); } catch (_) {}
      console.error('❌ cancelRound error:', error.message);
      throw error;
    }
  }

  // ==================== ADMIN: MANUAL END ROUND ====================
  async manualEndRound(roundId) {
    try {
      const round = await Round.findByPk(roundId);
      if (!round) throw new Error('Round not found');
      if (['completed', 'cancelled'].includes(round.status)) throw new Error('Round already ended');

      if (round.status === 'active') {
        await round.update({ status: 'locked', lockPrice: priceService.getPrice() });
      }

      const fresh = await Round.findByPk(roundId);
      console.log(`🛑 Admin manually ending round #${fresh.roundNumber}`);
      await this.endRound(fresh);

      await this._repairUpcomingSlots();

      return { success: true, message: `Round #${fresh.roundNumber} ended successfully` };
    } catch (error) {
      console.error('❌ manualEndRound error:', error.message);
      throw error;
    }
  }

  // ==================== ADMIN: FORCE START NEW ROUND ====================
  async forceStartNewRound() {
    try {
      console.log('🔄 Admin force-starting new round...');

      const activeRounds = await Round.findAll({
        where: { status: { [Op.in]: ['active', 'locked'] } }
      });

      for (const r of activeRounds) {
        await this.cancelRound(r.id, 'Force new round by admin');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.alignAndCreateRounds();

      const newActive = await this.getActiveRound();
      return {
        success: true,
        message: `New round #${newActive?.roundNumber} started`,
        round: newActive
      };
    } catch (error) {
      console.error('❌ forceStartNewRound error:', error.message);
      throw error;
    }
  }

  // ==================== REPAIR UPCOMING SLOTS ====================
  async _repairUpcomingSlots() {
    try {
      await new Promise(r => setTimeout(r, 500));

      const bm = this.BETTING_DURATION;
      const lm = this.LOCKED_DURATION;
      const now = Date.now();

      const currentSlotStart = getSlotStart(now, bm);
      const currentSlotLock = currentSlotStart + bm * 60 * 1000;
      const currentSlotEnd = currentSlotLock + lm * 60 * 1000;

      const nextSlotStart = currentSlotLock;
      const nextSlotLock = nextSlotStart + bm * 60 * 1000;
      const nextSlotEnd = nextSlotLock + lm * 60 * 1000;

      const activeRound = await Round.findOne({ where: { status: 'active' } });
      const lockedRound = await Round.findOne({ where: { status: 'locked' } });
      const upcomingRound = await Round.findOne({ where: { status: 'upcoming' } });

      const lastRound = await Round.findOne({
        where: { status: { [Op.in]: ['completed', 'active', 'locked', 'cancelled', 'upcoming'] } },
        order: [['roundNumber', 'DESC']]
      });
      let nextNum = lastRound ? lastRound.roundNumber + 1 : 1;

      const insideBettingWindow = now < currentSlotLock;

      if (!activeRound && insideBettingWindow) {
        const slotRound = await Round.findOne({
          where: {
            startTime: new Date(currentSlotStart),
            lockTime: new Date(currentSlotLock)
          }
        });

        if (!slotRound) {
          const startPrice = priceService.getPrice();
          const created = await Round.create({
            roundNumber: nextNum++,
            status: 'active',
            startTime: new Date(currentSlotStart),
            lockTime: new Date(currentSlotLock),
            endTime: new Date(currentSlotEnd),
            startPrice
          });

          this.cachedActiveRound = created;
          this.cacheExpiry = Date.now() + this.CACHE_DURATION;

          console.log(`✅ Repair: Created active round #${created.roundNumber} for current slot`);

          if (this.io) {
            this.io.emit('round_start', {
              roundId: created.id,
              roundNumber: created.roundNumber,
              startPrice,
              startTime: created.startTime,
              lockTime: created.lockTime,
              endTime: created.endTime
            });
          }
        } else {
          console.log(`ℹ️  Slot already used by round #${slotRound.roundNumber} (${slotRound.status}) – not replacing`);
        }
      }

      if (!upcomingRound) {
        const nextSlotRound = await Round.findOne({
          where: {
            startTime: new Date(nextSlotStart),
            lockTime: new Date(nextSlotLock)
          }
        });

        if (!nextSlotRound) {
          const created = await Round.create({
            roundNumber: nextNum,
            status: 'upcoming',
            startTime: new Date(nextSlotStart),
            lockTime: new Date(nextSlotLock),
            endTime: new Date(nextSlotEnd),
            startPrice: null
          });
          console.log(`📅 Repair: Created upcoming round #${created.roundNumber} (${new Date(nextSlotStart).toLocaleTimeString()})`);
        }
      }
    } catch (error) {
      console.error('❌ _repairUpcomingSlots error:', error.message);
    }
  }

  // ==================== GETTERS ====================
  async getActiveRound() {
    if (this.cachedActiveRound && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      if (this.cachedActiveRound.status === 'active') return this.cachedActiveRound;
    }
    const round = await Round.findOne({ where: { status: 'active' }, order: [['startTime', 'DESC']] });
    if (round) { this.cachedActiveRound = round; this.cacheExpiry = Date.now() + this.CACHE_DURATION; }
    return round;
  }

  async getLockedRound() {
    return Round.findOne({ where: { status: 'locked' }, order: [['lockTime', 'DESC']] });
  }

  async getPreviousRounds(limit = 3) {
    return Round.findAll({ where: { status: 'completed' }, order: [['endTime', 'DESC']], limit });
  }

  async getUpcomingRound() {
    return Round.findOne({ where: { status: 'upcoming' }, order: [['startTime', 'ASC']] });
  }

  async getAllRoundsData() {
    const [activeRound, lockedRound, previousRounds, upcomingRound] = await Promise.all([
      this.getActiveRound(),
      this.getLockedRound(),
      this.getPreviousRounds(3),
      this.getUpcomingRound()
    ]);
    return { activeRound, lockedRound, previousRounds, upcomingRound };
  }

  async getCurrentRound() {
    return this.getActiveRound();
  }

  getServerTime() {
    return { serverTime: new Date().toISOString(), timestamp: Date.now() };
  }

  // ==================== PROCESS BETS ====================
  async processBets(round, result, transaction) {
    try {
      const bets = await Bet.findAll({
        where: { roundId: round.id, result: 'pending' },
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'], required: false }],
        transaction
      });

      if (bets.length === 0) {
        console.log('   ℹ️  No bets in this round');
        await round.update({ isProcessed: true }, { transaction });
        return;
      }

      const upBets = bets.filter(b => b.prediction === 'up');
      const downBets = bets.filter(b => b.prediction === 'down');

      const totalUp = upBets.reduce((s, b) => s + parseFloat(b.stakeAmount), 0);
      const totalDown = downBets.reduce((s, b) => s + parseFloat(b.stakeAmount), 0);

      console.log(`   📈 UP  : ${upBets.length} bets ₦${totalUp.toLocaleString()}`);
      console.log(`   📉 DOWN: ${downBets.length} bets ₦${totalDown.toLocaleString()}`);

      if (result === 'tie') {
        console.log('   ➖ TIE – refunding all');
        await this.refundAllBets(round, bets, transaction, 'TIE');
        return;
      }

      const winners = result === 'up' ? upBets : downBets;
      const losers = result === 'up' ? downBets : upBets;
      const winnerPool = result === 'up' ? totalUp : totalDown;
      const loserPool = result === 'up' ? totalDown : totalUp;

      if (winners.length === 0) {
        console.log('   ❌ All predicted wrong – everyone loses');
        await this.processAllAsLosers(round, losers, transaction);
        return;
      }

      if (losers.length === 0) {
        console.log('   🎯 No opponents – refunding winners');
        await this.refundAllBets(round, winners, transaction, 'No opposing bets');
        return;
      }

      const platformFee = roundToTwo(loserPool * 0.30);
      const prizePool = roundToTwo(loserPool * 0.70);

      await round.update({ platformFee, prizePool, isProcessed: true }, { transaction });

      console.log(`   🏦 Platform 30%: ₦${platformFee.toLocaleString()}`);
      console.log(`   🎁 Prize Pool 70%: ₦${prizePool.toLocaleString()}`);

      // ── Winners ──
      for (const bet of winners) {
        const betAmount = parseFloat(bet.stakeAmount);
        const share = betAmount / winnerPool;
        const prize = prizePool * share;
        const payout = roundToTwo(betAmount + prize);
        const profit = roundToTwo(prize);
        const multiplier = roundToTwo(payout / betAmount);

        await bet.update({ result: 'win', payout, profit, isPaid: true }, { transaction });

        if (bet.isBot) { console.log(`   🤖 Bot WIN ₦${betAmount} → ₦${payout}`); continue; }

        const wallet = await Wallet.findOne({ where: { userId: bet.userId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!wallet) { console.error(`   ❌ Wallet not found: ${bet.userId}`); continue; }

        const bal = parseFloat(wallet.nairaBalance || 0);
        const locked = parseFloat(wallet.lockedBalance || 0);
        const newLocked = roundToTwo(Math.max(0, locked - betAmount));
        const newBal = roundToTwo(bal - betAmount + payout);

        await wallet.update({
          nairaBalance: newBal,
          lockedBalance: newLocked,
          totalWon: roundToTwo(parseFloat(wallet.totalWon || 0) + payout)
        }, { transaction });

        await Transaction.create({
          userId: bet.userId, type: 'bet_win', method: 'internal',
          amount: payout, status: 'completed',
          description: `Won ₦${payout.toLocaleString()} Round #${round.roundNumber} (${multiplier}x)`,
          metadata: { betId: bet.id, roundId: round.id, betAmount, prize: roundToTwo(prize), profit, multiplier },
          balanceBefore: bal, balanceAfter: newBal
        }, { transaction });

        console.log(`   ✅ ${bet.user?.username || bet.userId}: ₦${betAmount} → ₦${payout} (${multiplier}x)`);

        if (bet.user?.referredBy && !bet.user?.hasPlacedFirstBet) {
          await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
        }

        if (this.io) {
          this.io.to(String(bet.userId)).emit('bet_result', {
            betId: bet.id, result: 'win', amount: betAmount, payout, profit, multiplier, newBalance: newBal
          });
        }
      }

      // ── Losers ──
      for (const bet of losers) {
        const betAmount = parseFloat(bet.stakeAmount);

        await bet.update({ result: 'loss', payout: 0, profit: -betAmount, isPaid: true }, { transaction });

        if (bet.isBot) { console.log(`   🤖 Bot LOSS ₦${betAmount}`); continue; }

        const wallet = await Wallet.findOne({ where: { userId: bet.userId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!wallet) { console.error(`   ❌ Wallet not found: ${bet.userId}`); continue; }

        const bal = parseFloat(wallet.nairaBalance || 0);
        const locked = parseFloat(wallet.lockedBalance || 0);
        const newLocked = roundToTwo(Math.max(0, locked - betAmount));
        const newBal = roundToTwo(bal - betAmount);

        await wallet.update({
          nairaBalance: newBal, lockedBalance: newLocked,
          totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betAmount)
        }, { transaction });

        await Transaction.create({
          userId: bet.userId, type: 'bet_loss', method: 'internal',
          amount: betAmount, status: 'completed',
          description: `Lost ₦${betAmount.toLocaleString()} Round #${round.roundNumber}`,
          metadata: { betId: bet.id, roundId: round.id },
          balanceBefore: bal, balanceAfter: newBal
        }, { transaction });

        console.log(`   ❌ ${bet.user?.username || bet.userId}: Lost ₦${betAmount}`);

        if (bet.user?.referredBy) {
          if (!bet.user.hasPlacedFirstBet) await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
          await safeProcessReferral('influencer', bet.userId, betAmount, bet.id, transaction);
        }

        if (this.io) {
          this.io.to(String(bet.userId)).emit('bet_result', {
            betId: bet.id, result: 'loss', amount: betAmount, payout: 0, profit: -betAmount, newBalance: newBal
          });
        }
      }
    } catch (error) {
      console.error('❌ processBets error:', error);
      throw error;
    }
  }

  async processAllAsLosers(round, losers, transaction) {
    let totalLost = 0;

    for (const bet of losers) {
      const betAmount = parseFloat(bet.stakeAmount);
      totalLost += betAmount;

      await bet.update({ result: 'loss', payout: 0, profit: -betAmount, isPaid: true }, { transaction });

      if (bet.isBot) { console.log(`   🤖 Bot LOSS ₦${betAmount}`); continue; }

      const wallet = await Wallet.findOne({ where: { userId: bet.userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!wallet) continue;

      const bal = parseFloat(wallet.nairaBalance || 0);
      const locked = parseFloat(wallet.lockedBalance || 0);
      const newLocked = roundToTwo(Math.max(0, locked - betAmount));
      const newBal = roundToTwo(bal - betAmount);

      await wallet.update({
        nairaBalance: newBal, lockedBalance: newLocked,
        totalLost: roundToTwo(parseFloat(wallet.totalLost || 0) + betAmount)
      }, { transaction });

      await Transaction.create({
        userId: bet.userId, type: 'bet_loss', method: 'internal',
        amount: betAmount, status: 'completed',
        description: `Lost ₦${betAmount.toLocaleString()} Round #${round.roundNumber} (all wrong)`,
        metadata: { betId: bet.id, roundId: round.id },
        balanceBefore: bal, balanceAfter: newBal
      }, { transaction });

      if (bet.user?.referredBy) {
        if (!bet.user.hasPlacedFirstBet) await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
        await safeProcessReferral('influencer', bet.userId, betAmount, bet.id, transaction);
      }

      if (this.io) {
        this.io.to(String(bet.userId)).emit('bet_result', {
          betId: bet.id, result: 'loss', amount: betAmount, payout: 0, profit: -betAmount, newBalance: newBal
        });
      }
    }

    await round.update({ platformFee: roundToTwo(totalLost), prizePool: 0, isProcessed: true }, { transaction });
    console.log(`   🏦 Platform collected: ₦${totalLost.toLocaleString()}`);
  }

  async refundAllBets(round, bets, transaction, reason) {
    for (const bet of bets) {
      const betAmount = parseFloat(bet.stakeAmount);

      await bet.update({ result: 'refund', payout: betAmount, profit: 0, isPaid: true }, { transaction });

      if (bet.isBot) { console.log(`   🤖 Bot REFUND ₦${betAmount}`); continue; }

      const wallet = await Wallet.findOne({ where: { userId: bet.userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!wallet) continue;

      const bal = parseFloat(wallet.nairaBalance || 0);
      const locked = parseFloat(wallet.lockedBalance || 0);
      const newLocked = roundToTwo(Math.max(0, locked - betAmount));

      await wallet.update({ lockedBalance: newLocked }, { transaction });

      await Transaction.create({
        userId: bet.userId, type: 'refund', method: 'internal',
        amount: betAmount, status: 'completed',
        description: `Refund ₦${betAmount.toLocaleString()} Round #${round.roundNumber} (${reason})`,
        metadata: { betId: bet.id, roundId: round.id, reason },
        balanceBefore: bal, balanceAfter: bal
      }, { transaction });

      console.log(`   🔄 Refunded ₦${betAmount} to user ${bet.userId}`);

      if (bet.user?.referredBy && !bet.user?.hasPlacedFirstBet) {
        await safeProcessReferral('first_bet', bet.userId, betAmount, bet.id, transaction);
      }

      if (this.io) {
        this.io.to(String(bet.userId)).emit('bet_result', {
          betId: bet.id, result: 'refund', amount: betAmount, payout: betAmount, profit: 0, newBalance: bal
        });
      }
    }

    await round.update({ platformFee: 0, prizePool: 0, isProcessed: true }, { transaction });
  }

  // ==================== CLEANUP ====================
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('🎮 Round manager stopped');
    }
  }
}

const roundService = new RoundService();
module.exports = roundService;
