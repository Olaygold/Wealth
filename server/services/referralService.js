// server/services/referralService.js
const { User, Wallet, ReferralEarning, Transaction } = require('../models');

/**
 * Process influencer commission when a referred user loses a bet
 * This function should be called from bet settlement logic
 * 
 * @param {string} loserId - The user ID who lost the bet
 * @param {number} lossAmount - The amount lost (stake amount)
 * @param {string} betId - The bet ID
 * @param {object} dbTransaction - Sequelize transaction
 * @returns {object|null} - Commission result or null if no commission
 */
const processInfluencerCommission = async (loserId, lossAmount, betId, dbTransaction) => {
  try {
    console.log(`\n💰 Processing influencer commission check...`);
    console.log(`   Loser ID: ${loserId}`);
    console.log(`   Loss Amount: ₦${lossAmount}`);
    console.log(`   Bet ID: ${betId}`);

    // Step 1: Get the losing user with their referrer info
    const loser = await User.findByPk(loserId, {
      attributes: ['id', 'username', 'referredBy'],
      transaction: dbTransaction
    });

    if (!loser) {
      console.log(`   ℹ️ User ${loserId} not found`);
      return null;
    }

    if (!loser.referredBy) {
      console.log(`   ℹ️ User ${loser.username} has no referrer, skipping commission`);
      return null;
    }

    // Step 2: Get the referrer (potential influencer)
    const referrer = await User.findByPk(loser.referredBy, {
      attributes: [
        'id', 'username', 'referralType', 'influencerPercentage', 
        'referralBalance', 'totalReferralEarnings'
      ],
      transaction: dbTransaction
    });

    if (!referrer) {
      console.log(`   ℹ️ Referrer ${loser.referredBy} not found`);
      return null;
    }

    // Step 3: Check if referrer is an influencer
    if (referrer.referralType !== 'influencer') {
      console.log(`   ℹ️ Referrer ${referrer.username} is not an influencer (type: ${referrer.referralType})`);
      return null;
    }

    // Step 4: Get commission percentage
    const commissionPercentage = parseFloat(referrer.influencerPercentage) || 0;
    
    if (commissionPercentage <= 0) {
      console.log(`   ℹ️ Influencer ${referrer.username} has 0% commission rate`);
      return null;
    }

    // Step 5: Calculate commission
    const commissionAmount = (parseFloat(lossAmount) * commissionPercentage) / 100;

    if (commissionAmount <= 0) {
      console.log(`   ℹ️ Commission amount is 0`);
      return null;
    }

    console.log(`   ✅ Influencer found: ${referrer.username}`);
    console.log(`   📊 Commission Rate: ${commissionPercentage}%`);
    console.log(`   💵 Commission Amount: ₦${commissionAmount.toFixed(2)}`);

    // Step 6: Check if commission already exists for this bet (prevent duplicates)
    const existingEarning = await ReferralEarning.findOne({
      where: { 
        betId: betId,
        referrerId: referrer.id,
        type: 'loss_commission'
      },
      transaction: dbTransaction
    });

    if (existingEarning) {
      console.log(`   ⚠️ Commission already processed for this bet`);
      return {
        success: true,
        alreadyProcessed: true,
        earningId: existingEarning.id
      };
    }

    // Step 7: Create referral earning record with status 'completed'
    const earning = await ReferralEarning.create({
      referrerId: referrer.id,
      referredUserId: loserId,
      betId: betId,
      type: 'loss_commission',
      betAmount: parseFloat(lossAmount),
      percentage: commissionPercentage,
      earnedAmount: commissionAmount,
      status: 'completed', // ✅ NOT pending!
      description: `${commissionPercentage}% commission on ${loser.username}'s lost bet of ₦${lossAmount}`
    }, { transaction: dbTransaction });

    console.log(`   ✅ ReferralEarning created (ID: ${earning.id})`);

    // Step 8: Update influencer's referral balance
    const currentBalance = parseFloat(referrer.referralBalance) || 0;
    const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings) || 0;
    const newBalance = currentBalance + commissionAmount;
    const newTotalEarnings = currentTotalEarnings + commissionAmount;

    await User.update({
      referralBalance: newBalance,
      totalReferralEarnings: newTotalEarnings
    }, {
      where: { id: referrer.id },
      transaction: dbTransaction
    });

    console.log(`   ✅ Influencer balance updated: ₦${currentBalance.toFixed(2)} → ₦${newBalance.toFixed(2)}`);

    // Step 9: Create transaction record for the commission
    const transactionRef = `REF-COMM-${betId.substring(0, 8)}-${Date.now()}`;
    
    await Transaction.create({
      userId: referrer.id,
      type: 'referral_commission',
      method: 'internal',
      amount: commissionAmount,
      currency: 'NGN',
      status: 'completed', // ✅ NOT pending!
      description: `Influencer commission: ${commissionPercentage}% of ₦${lossAmount} from ${loser.username}'s loss`,
      reference: transactionRef,
      metadata: {
        earningId: earning.id,
        referredUserId: loserId,
        referredUsername: loser.username,
        betId: betId,
        lossAmount: parseFloat(lossAmount),
        commissionPercentage: commissionPercentage,
        commissionAmount: commissionAmount
      }
    }, { transaction: dbTransaction });

    console.log(`   ✅ Transaction created (Ref: ${transactionRef})`);
    console.log(`   🎉 Commission successfully processed!`);
    console.log(`   ${referrer.username} earned ₦${commissionAmount.toFixed(2)} from ${loser.username}'s loss\n`);

    return {
      success: true,
      influencerId: referrer.id,
      influencerUsername: referrer.username,
      loserId: loserId,
      loserUsername: loser.username,
      lossAmount: parseFloat(lossAmount),
      commissionPercentage: commissionPercentage,
      commissionAmount: commissionAmount,
      newReferralBalance: newBalance,
      earningId: earning.id
    };

  } catch (error) {
    console.error('❌ Error processing influencer commission:', error);
    // Don't throw - we don't want commission processing to break bet settlement
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process first bet bonus for normal referrers (not influencers)
 * Called when a user places their first bet
 * 
 * @param {string} bettorId - The user ID who placed the bet
 * @param {number} betAmount - The bet amount
 * @param {string} betId - The bet ID
 * @param {object} dbTransaction - Sequelize transaction
 */
const processFirstBetBonus = async (bettorId, betAmount, betId, dbTransaction) => {
  try {
    console.log(`\n🎁 Processing first bet bonus check...`);
    console.log(`   Bettor ID: ${bettorId}`);
    console.log(`   Bet Amount: ₦${betAmount}`);

    const bettor = await User.findByPk(bettorId, {
      attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'],
      transaction: dbTransaction
    });

    // Skip if user already placed first bet or has no referrer
    if (!bettor) {
      console.log(`   ℹ️ Bettor not found`);
      return null;
    }

    if (bettor.hasPlacedFirstBet) {
      console.log(`   ℹ️ ${bettor.username} already placed first bet`);
      return null;
    }

    if (!bettor.referredBy) {
      console.log(`   ℹ️ ${bettor.username} has no referrer`);
      // Still mark as first bet placed
      await User.update(
        { hasPlacedFirstBet: true },
        { where: { id: bettorId }, transaction: dbTransaction }
      );
      return null;
    }

    const referrer = await User.findByPk(bettor.referredBy, {
      attributes: [
        'id', 'username', 'referralType', 'referralBalance', 
        'totalReferralEarnings', 'referralCount'
      ],
      transaction: dbTransaction
    });

    if (!referrer) {
      console.log(`   ℹ️ Referrer not found`);
      await User.update(
        { hasPlacedFirstBet: true },
        { where: { id: bettorId }, transaction: dbTransaction }
      );
      return null;
    }

    // For influencers, they get commission on losses instead of first bet bonus
    if (referrer.referralType === 'influencer') {
      console.log(`   ℹ️ Referrer ${referrer.username} is influencer - will get commission on losses instead`);
      await User.update(
        { hasPlacedFirstBet: true },
        { where: { id: bettorId }, transaction: dbTransaction }
      );
      return null;
    }

    // Normal referrer - give 5% first bet bonus
    const bonusPercentage = 5;
    const bonusAmount = (parseFloat(betAmount) * bonusPercentage) / 100;

    console.log(`   ✅ Normal referrer: ${referrer.username}`);
    console.log(`   📊 Bonus Rate: ${bonusPercentage}%`);
    console.log(`   💵 Bonus Amount: ₦${bonusAmount.toFixed(2)}`);

    // Create earning record
    const earning = await ReferralEarning.create({
      referrerId: referrer.id,
      referredUserId: bettorId,
      betId: betId,
      type: 'first_bet',
      betAmount: parseFloat(betAmount),
      percentage: bonusPercentage,
      earnedAmount: bonusAmount,
      status: 'completed',
      description: `First bet bonus: ${bonusPercentage}% of ${bettor.username}'s first bet of ₦${betAmount}`
    }, { transaction: dbTransaction });

    // Update referrer balance and count
    const currentBalance = parseFloat(referrer.referralBalance) || 0;
    const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings) || 0;
    const currentCount = parseInt(referrer.referralCount) || 0;

    await User.update({
      referralBalance: currentBalance + bonusAmount,
      totalReferralEarnings: currentTotalEarnings + bonusAmount,
      referralCount: currentCount + 1
    }, {
      where: { id: referrer.id },
      transaction: dbTransaction
    });

    // Mark bettor as having placed first bet
    await User.update({
      hasPlacedFirstBet: true
    }, {
      where: { id: bettorId },
      transaction: dbTransaction
    });

    // Create transaction
    await Transaction.create({
      userId: referrer.id,
      type: 'referral_bonus',
      method: 'internal',
      amount: bonusAmount,
      currency: 'NGN',
      status: 'completed',
      description: `First bet bonus from ${bettor.username}`,
      reference: `REF-BONUS-${betId.substring(0, 8)}-${Date.now()}`,
      metadata: {
        earningId: earning.id,
        referredUserId: bettorId,
        referredUsername: bettor.username,
        betId: betId,
        betAmount: parseFloat(betAmount),
        bonusPercentage: bonusPercentage
      }
    }, { transaction: dbTransaction });

    console.log(`   🎉 First bet bonus processed!`);
    console.log(`   ${referrer.username} earned ₦${bonusAmount.toFixed(2)} from ${bettor.username}'s first bet\n`);

    return {
      success: true,
      referrerId: referrer.id,
      referrerUsername: referrer.username,
      bonusAmount: bonusAmount
    };

  } catch (error) {
    console.error('❌ Error processing first bet bonus:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processInfluencerCommission,
  processFirstBetBonus
};
