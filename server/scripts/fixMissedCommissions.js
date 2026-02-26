// server/scripts/fixMissedCommissions.js
// Run this ONCE to fix all missed referral commissions

const { User, Bet, ReferralEarning, Transaction } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const fixMissedCommissions = async () => {
  console.log('🔧 Starting fix for missed referral commissions...\n');

  const dbTransaction = await sequelize.transaction();

  try {
    // =====================================================
    // STEP 1: Find all users who were referred
    // =====================================================
    const referredUsers = await User.findAll({
      where: {
        referredBy: { [Op.ne]: null }
      },
      attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'],
      transaction: dbTransaction
    });

    console.log(`📊 Found ${referredUsers.length} referred users\n`);

    let totalFirstBetFixed = 0;
    let totalLossCommissionFixed = 0;
    let totalAmountPaid = 0;

    for (const user of referredUsers) {
      console.log(`\n👤 Processing ${user.username}...`);

      // Get referrer
      const referrer = await User.findByPk(user.referredBy, {
        attributes: ['id', 'username', 'referralType', 'influencerPercentage', 'referralBalance', 'totalReferralEarnings'],
        transaction: dbTransaction
      });

      if (!referrer) {
        console.log(`   ⚠️ Referrer not found, skipping`);
        continue;
      }

      console.log(`   Referrer: ${referrer.username} (${referrer.referralType || 'normal'})`);

      // Get all bets by this user (win OR loss - both count)
      const userBets = await Bet.findAll({
        where: { 
          userId: user.id,
          result: { [Op.in]: ['win', 'loss'] } // Both win and loss bets
        },
        order: [['createdAt', 'ASC']], // Oldest first
        transaction: dbTransaction
      });

      console.log(`   Total bets: ${userBets.length}`);

      if (userBets.length === 0) {
        console.log(`   ℹ️ No completed bets found`);
        continue;
      }

      // =====================================================
      // STEP 2: NORMAL REFERRER - First bet bonus (win OR loss)
      // =====================================================
      if (referrer.referralType === 'normal' || !referrer.referralType) {
        // Get the FIRST bet (regardless of win/loss)
        const firstBet = userBets[0];

        console.log(`   First bet: ${firstBet.id.substring(0, 8)} - Result: ${firstBet.result} - Amount: ₦${firstBet.stakeAmount}`);

        // Check if first bet bonus already exists
        const existingFirstBetEarning = await ReferralEarning.findOne({
          where: {
            referrerId: referrer.id,
            referredUserId: user.id,
            type: 'first_bet'
          },
          transaction: dbTransaction
        });

        if (!existingFirstBetEarning) {
          const betAmount = parseFloat(firstBet.stakeAmount);
          const percentage = 5;
          const commission = Math.round((betAmount * percentage / 100) * 100) / 100;

          console.log(`   🎁 MISSING First bet bonus: ₦${commission.toFixed(2)} (5% of ₦${betAmount})`);

          // Create earning record
          const earning = await ReferralEarning.create({
            referrerId: referrer.id,
            referredUserId: user.id,
            betId: firstBet.id,
            type: 'first_bet',
            percentage: percentage,
            betAmount: betAmount,
            earnedAmount: commission,
            status: 'completed',
            description: `First bet bonus: 5% of ${user.username}'s first bet (${firstBet.result})`
          }, { transaction: dbTransaction });

          // Update referrer balance
          const currentBalance = parseFloat(referrer.referralBalance || 0);
          const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings || 0);
          const newBalance = currentBalance + commission;
          const newTotalEarnings = currentTotalEarnings + commission;

          await User.update({
            referralBalance: newBalance,
            totalReferralEarnings: newTotalEarnings
          }, {
            where: { id: referrer.id },
            transaction: dbTransaction
          });

          // Create transaction record
          await Transaction.create({
            userId: referrer.id,
            type: 'referral_bonus',
            method: 'internal',
            amount: commission,
            currency: 'NGN',
            status: 'completed',
            description: `First bet bonus from ${user.username} (${firstBet.result})`,
            reference: `FIX-BONUS-${firstBet.id.substring(0, 8)}-${Date.now()}`,
            metadata: {
              earningId: earning.id,
              referredUserId: user.id,
              referredUsername: user.username,
              betId: firstBet.id,
              betResult: firstBet.result,
              fixed: true
            }
          }, { transaction: dbTransaction });

          // Mark user as hasPlacedFirstBet
          await User.update({
            hasPlacedFirstBet: true
          }, {
            where: { id: user.id },
            transaction: dbTransaction
          });

          // Update local referrer object
          referrer.referralBalance = newBalance;
          referrer.totalReferralEarnings = newTotalEarnings;

          totalFirstBetFixed++;
          totalAmountPaid += commission;

          console.log(`   ✅ First bet bonus FIXED! ${referrer.username} earned ₦${commission.toFixed(2)}`);
          console.log(`   ✅ New balance: ₦${newBalance.toFixed(2)}`);
        } else {
          console.log(`   ℹ️ First bet bonus already exists (₦${existingFirstBetEarning.earnedAmount})`);
          
          // Still mark hasPlacedFirstBet if not set
          if (!user.hasPlacedFirstBet) {
            await User.update({
              hasPlacedFirstBet: true
            }, {
              where: { id: user.id },
              transaction: dbTransaction
            });
            console.log(`   ✅ Marked hasPlacedFirstBet = true`);
          }
        }
      }

      // =====================================================
      // STEP 3: INFLUENCER - Loss commissions on EVERY loss
      // =====================================================
      else if (referrer.referralType === 'influencer') {
        const percentage = parseFloat(referrer.influencerPercentage) || 0;

        if (percentage <= 0) {
          console.log(`   ⚠️ Influencer has 0% rate, skipping`);
          continue;
        }

        console.log(`   Influencer rate: ${percentage}%`);

        // Get only LOST bets
        const lostBets = userBets.filter(bet => bet.result === 'loss');
        console.log(`   Lost bets: ${lostBets.length}`);

        for (const bet of lostBets) {
          // Check if commission already exists for this bet
          const existingEarning = await ReferralEarning.findOne({
            where: {
              referrerId: referrer.id,
              referredUserId: user.id,
              betId: bet.id,
              type: 'loss_commission'
            },
            transaction: dbTransaction
          });

          if (!existingEarning) {
            const betAmount = parseFloat(bet.stakeAmount);
            const commission = Math.round((betAmount * percentage / 100) * 100) / 100;

            console.log(`   💰 MISSING Loss commission for bet ${bet.id.substring(0, 8)}: ₦${commission.toFixed(2)}`);

            // Create earning record
            const earning = await ReferralEarning.create({
              referrerId: referrer.id,
              referredUserId: user.id,
              betId: bet.id,
              type: 'loss_commission',
              percentage: percentage,
              betAmount: betAmount,
              earnedAmount: commission,
              status: 'completed',
              description: `Loss commission: ${percentage}% of ${user.username}'s loss of ₦${betAmount}`
            }, { transaction: dbTransaction });

            // Update referrer balance
            const currentBalance = parseFloat(referrer.referralBalance || 0);
            const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings || 0);
            const newBalance = currentBalance + commission;
            const newTotalEarnings = currentTotalEarnings + commission;

            await User.update({
              referralBalance: newBalance,
              totalReferralEarnings: newTotalEarnings
            }, {
              where: { id: referrer.id },
              transaction: dbTransaction
            });

            // Create transaction record
            await Transaction.create({
              userId: referrer.id,
              type: 'referral_commission',
              method: 'internal',
              amount: commission,
              currency: 'NGN',
              status: 'completed',
              description: `Influencer commission from ${user.username}'s loss`,
              reference: `FIX-COMM-${bet.id.substring(0, 8)}-${Date.now()}`,
              metadata: {
                earningId: earning.id,
                referredUserId: user.id,
                referredUsername: user.username,
                betId: bet.id,
                fixed: true
              }
            }, { transaction: dbTransaction });

            // Update local referrer object
            referrer.referralBalance = newBalance;
            referrer.totalReferralEarnings = newTotalEarnings;

            totalLossCommissionFixed++;
            totalAmountPaid += commission;

            console.log(`   ✅ Loss commission FIXED! Balance: ₦${newBalance.toFixed(2)}`);
          }
        }

        // Mark hasPlacedFirstBet for influencer referrals too
        if (userBets.length > 0 && !user.hasPlacedFirstBet) {
          await User.update({
            hasPlacedFirstBet: true
          }, {
            where: { id: user.id },
            transaction: dbTransaction
          });
          console.log(`   ✅ Marked hasPlacedFirstBet = true`);
        }
      }
    }

    await dbTransaction.commit();

    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`   📊 Referred users processed: ${referredUsers.length}`);
    console.log(`   🎁 First bet bonuses fixed: ${totalFirstBetFixed}`);
    console.log(`   💰 Loss commissions fixed: ${totalLossCommissionFixed}`);
    console.log(`   💵 Total amount paid: ₦${totalAmountPaid.toLocaleString()}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      usersProcessed: referredUsers.length,
      firstBetFixed: totalFirstBetFixed,
      lossCommissionFixed: totalLossCommissionFixed,
      totalAmountPaid: totalAmountPaid
    };

  } catch (error) {
    await dbTransaction.rollback();
    console.error('\n❌ FIX FAILED:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Run if called directly: node scripts/fixMissedCommissions.js
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  console.log('🚀 Starting Fix Script...\n');
  
  sequelize.authenticate()
    .then(() => {
      console.log('📡 Database connected\n');
      return fixMissedCommissions();
    })
    .then((result) => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixMissedCommissions };
