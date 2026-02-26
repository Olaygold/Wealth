
// server/utils/referralCommission.js
const { User, ReferralEarning, Transaction } = require('../models');

/**
 * Process referral commission when a bet is settled
 * 
 * RULES:
 * - NORMAL REFERRER: Gets 5% of the FIRST BET amount (win OR loss)
 * - INFLUENCER: Gets X% of EVERY LOSS amount
 * 
 * @param {string} userId - The user who placed the bet
 * @param {string} betId - The bet ID
 * @param {number} betAmount - The bet stake amount
 * @param {string} betResult - 'win' or 'loss'
 * @param {object} dbTransaction - Sequelize transaction
 * @returns {Promise<Object|null>} Commission details or null
 */
const processReferralCommission = async (userId, betId, betAmount, betResult, dbTransaction) => {
  try {
    console.log(`\n🔍 Checking referral commission...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Bet ID: ${betId}`);
    console.log(`   Bet Amount: ₦${betAmount}`);
    console.log(`   Bet Result: ${betResult}`);

    // =====================================================
    // STEP 1: Get user with referrer info
    // =====================================================
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'referredBy', 'hasPlacedFirstBet'],
      transaction: dbTransaction
    });

    if (!user) {
      console.log(`   ℹ️ User not found`);
      return null;
    }

    console.log(`   User: ${user.username}`);
    console.log(`   Has Placed First Bet: ${user.hasPlacedFirstBet}`);
    console.log(`   Referred By: ${user.referredBy || 'None'}`);

    // No referrer = no commission
    if (!user.referredBy) {
      console.log(`   ℹ️ User has no referrer - skipping commission`);
      return null;
    }

    // =====================================================
    // STEP 2: Get referrer details
    // =====================================================
    const referrer = await User.findByPk(user.referredBy, {
      attributes: [
        'id', 'username', 'referralType', 'influencerPercentage', 
        'referralBalance', 'totalReferralEarnings', 'referralCount'
      ],
      transaction: dbTransaction
    });

    if (!referrer) {
      console.log(`   ❌ Referrer ${user.referredBy} not found`);
      return null;
    }

    console.log(`   Referrer: ${referrer.username}`);
    console.log(`   Referrer Type: ${referrer.referralType || 'normal'}`);
    console.log(`   Influencer %: ${referrer.influencerPercentage || 'N/A'}`);
    console.log(`   Current Balance: ₦${parseFloat(referrer.referralBalance || 0).toFixed(2)}`);

    let commission = 0;
    let commissionType = null;
    let percentage = 0;
    let shouldMarkFirstBet = false;

    // =====================================================
    // STEP 3: NORMAL REFERRER - 5% of FIRST BET (win OR loss)
    // =====================================================
    if (referrer.referralType === 'normal' || !referrer.referralType) {
      console.log(`   📋 Processing for NORMAL referrer...`);
      
      // Only pay commission on the FIRST BET (regardless of win/loss)
      if (!user.hasPlacedFirstBet) {
        percentage = 5;
        commission = parseFloat(betAmount) * (percentage / 100);
        commissionType = 'first_bet';
        shouldMarkFirstBet = true;

        console.log(`   ✅ FIRST BET! Commission: ₦${commission.toFixed(2)} (5% of ₦${betAmount})`);
        console.log(`   📊 Bet result was: ${betResult} (doesn't matter for normal referrer)`);
      } else {
        console.log(`   ℹ️ User already placed first bet - no commission for normal referrer`);
        return null;
      }
    }
    
    // =====================================================
    // STEP 4: INFLUENCER - X% of EVERY LOSS
    // =====================================================
    else if (referrer.referralType === 'influencer') {
      console.log(`   📋 Processing for INFLUENCER referrer...`);
      
      // Mark first bet if not already
      if (!user.hasPlacedFirstBet) {
        shouldMarkFirstBet = true;
      }

      // Only pay commission when the bet LOSES
      if (betResult === 'loss') {
        percentage = parseFloat(referrer.influencerPercentage) || 0;
        
        if (percentage <= 0) {
          console.log(`   ⚠️ Influencer has 0% rate - no commission`);
          
          // Still mark first bet
          if (shouldMarkFirstBet) {
            await User.update({
              hasPlacedFirstBet: true
            }, { 
              where: { id: userId },
              transaction: dbTransaction 
            });
            console.log(`   ✅ Marked ${user.username} as hasPlacedFirstBet = true`);
          }
          return null;
        }

        if (percentage > 10) {
          console.log(`   ⚠️ Invalid influencer percentage: ${percentage}% (max is 10%)`);
          percentage = 10;
        }

        commission = parseFloat(betAmount) * (percentage / 100);
        commissionType = 'loss_commission';

        console.log(`   ✅ LOSS DETECTED! Commission: ₦${commission.toFixed(2)} (${percentage}% of ₦${betAmount})`);
      } else {
        console.log(`   ℹ️ Bet result is '${betResult}' - influencers only earn on losses`);
        
        // Still mark first bet
        if (shouldMarkFirstBet) {
          await User.update({
            hasPlacedFirstBet: true
          }, { 
            where: { id: userId },
            transaction: dbTransaction 
          });
          console.log(`   ✅ Marked ${user.username} as hasPlacedFirstBet = true`);
        }
        return null;
      }
    }

    // =====================================================
    // STEP 5: PAY THE COMMISSION
    // =====================================================
    if (commission > 0 && commissionType) {
      // Round to 2 decimal places
      commission = Math.round(commission * 100) / 100;

      console.log(`\n💰 PAYING COMMISSION:`);
      console.log(`   Referrer: ${referrer.username}`);
      console.log(`   Type: ${commissionType}`);
      console.log(`   Amount: ₦${commission.toFixed(2)}`);

      // =====================================================
      // STEP 5a: Check for duplicate (prevent double payments)
      // =====================================================
      const existingEarning = await ReferralEarning.findOne({
        where: {
          referrerId: referrer.id,
          referredUserId: userId,
          betId: betId,
          type: commissionType
        },
        transaction: dbTransaction
      });

      if (existingEarning) {
        console.log(`   ⚠️ Commission already paid for this bet - skipping duplicate`);
        
        // Still mark first bet if needed
        if (shouldMarkFirstBet && !user.hasPlacedFirstBet) {
          await User.update({
            hasPlacedFirstBet: true
          }, { 
            where: { id: userId },
            transaction: dbTransaction 
          });
        }
        
        return {
          alreadyPaid: true,
          earningId: existingEarning.id
        };
      }

      // =====================================================
      // STEP 5b: Create ReferralEarning record
      // =====================================================
      const earning = await ReferralEarning.create({
        referrerId: referrer.id,
        referredUserId: userId,
        betId: betId,
        type: commissionType,
        percentage: percentage,
        betAmount: parseFloat(betAmount),
        earnedAmount: commission,
        status: 'credited',
        description: commissionType === 'first_bet' 
          ? `First bet bonus: ${percentage}% of ${user.username}'s first bet (₦${betAmount})`
          : `Loss commission: ${percentage}% of ${user.username}'s loss (₦${betAmount})`
      }, { transaction: dbTransaction });

      console.log(`   ✅ ReferralEarning created (ID: ${earning.id})`);

      // =====================================================
      // STEP 5c: Update referrer's balances
      // =====================================================
      const currentReferralBalance = parseFloat(referrer.referralBalance) || 0;
      const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings) || 0;
      const currentReferralCount = parseInt(referrer.referralCount) || 0;
      
      const newReferralBalance = currentReferralBalance + commission;
      const newTotalEarnings = currentTotalEarnings + commission;

      const updateData = {
        referralBalance: newReferralBalance,
        totalReferralEarnings: newTotalEarnings
      };

      // Increment referral count only on first bet (for normal referrers)
      if (commissionType === 'first_bet') {
        updateData.referralCount = currentReferralCount + 1;
      }

      await User.update(updateData, { 
        where: { id: referrer.id },
        transaction: dbTransaction 
      });

      console.log(`   ✅ Referrer balance updated: ₦${currentReferralBalance.toFixed(2)} → ₦${newReferralBalance.toFixed(2)}`);

      // =====================================================
      // STEP 5d: Create Transaction record (for history)
      // =====================================================
      const transactionRef = `REF-${commissionType === 'first_bet' ? 'BONUS' : 'COMM'}-${betId.substring(0, 8)}-${Date.now()}`;
      
      await Transaction.create({
        userId: referrer.id,
        type: commissionType === 'first_bet' ? 'referral_bonus' : 'referral_commission',
        method: 'internal',
        amount: commission,
        currency: 'NGN',
        status: 'completed',
        description: commissionType === 'first_bet'
          ? `Referral bonus: ${percentage}% from ${user.username}'s first bet`
          : `Influencer commission: ${percentage}% from ${user.username}'s loss`,
        reference: transactionRef,
        balanceBefore: currentReferralBalance,
        balanceAfter: newReferralBalance,
        metadata: {
          earningId: earning.id,
          referredUserId: userId,
          referredUsername: user.username,
          betId: betId,
          betAmount: parseFloat(betAmount),
          betResult: betResult,
          commissionType: commissionType,
          percentage: percentage,
          commission: commission
        }
      }, { transaction: dbTransaction });

      console.log(`   ✅ Transaction created (Ref: ${transactionRef})`);

      // =====================================================
      // STEP 5e: Mark user's first bet
      // =====================================================
      if (shouldMarkFirstBet) {
        await User.update({
          hasPlacedFirstBet: true
        }, { 
          where: { id: userId },
          transaction: dbTransaction 
        });
        console.log(`   ✅ Marked ${user.username} as hasPlacedFirstBet = true`);
      }

      console.log(`\n🎉 REFERRAL COMMISSION COMPLETE!`);
      console.log(`   ${referrer.username} earned ₦${commission.toFixed(2)} from ${user.username}`);
      console.log(`   New Referral Balance: ₦${newReferralBalance.toFixed(2)}\n`);

      return {
        success: true,
        earningId: earning.id,
        referrerId: referrer.id,
        referrerUsername: referrer.username,
        referrerType: referrer.referralType || 'normal',
        referredUserId: userId,
        referredUsername: user.username,
        type: commissionType,
        percentage: percentage,
        betAmount: parseFloat(betAmount),
        betResult: betResult,
        commission: commission,
        newReferralBalance: newReferralBalance
      };
    }

    // Mark first bet even if no commission (e.g., influencer's referral won)
    if (shouldMarkFirstBet && !user.hasPlacedFirstBet) {
      await User.update({
        hasPlacedFirstBet: true
      }, { 
        where: { id: userId },
        transaction: dbTransaction 
      });
      console.log(`   ✅ Marked ${user.username} as hasPlacedFirstBet = true (no commission this time)`);
    }

    console.log(`   ℹ️ No commission to pay\n`);
    return null;

  } catch (error) {
    console.error('❌ Referral commission processing error:', error);
    console.error('   Stack:', error.stack);
    // Don't throw - return null so bet processing can continue
    return null;
  }
};

/**
 * Check if user should trigger first bet commission
 * 
 * @param {string} userId - User ID
 * @param {object} dbTransaction - Sequelize transaction
 * @returns {Promise<boolean>}
 */
const shouldTriggerFirstBetCommission = async (userId, dbTransaction) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['hasPlacedFirstBet', 'referredBy'],
      transaction: dbTransaction
    });

    // Has a referrer AND hasn't placed first bet yet
    return user && user.referredBy && !user.hasPlacedFirstBet;
  } catch (error) {
    console.error('❌ Check first bet error:', error);
    return false;
  }
};

/**
 * Get referrer's commission info for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} { type: 'normal'|'influencer', percentage: number }
 */
const getReferrerCommissionRate = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['referredBy'],
      include: [{
        model: User,
        as: 'referrer',
        attributes: ['id', 'username', 'referralType', 'influencerPercentage']
      }]
    });

    if (!user || !user.referrer) {
      return null;
    }

    const referrer = user.referrer;

    if (referrer.referralType === 'influencer') {
      return {
        type: 'influencer',
        percentage: parseFloat(referrer.influencerPercentage) || 0,
        referrerUsername: referrer.username
      };
    }

    return {
      type: 'normal',
      percentage: 5,
      referrerUsername: referrer.username
    };

  } catch (error) {
    console.error('❌ Get commission rate error:', error);
    return null;
  }
};

/**
 * Get user's referral summary
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const getUserReferralSummary = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'referralCode', 'referralType',
        'influencerPercentage', 'referralBalance', 
        'totalReferralEarnings', 'referralCount'
      ]
    });

    if (!user) {
      return null;
    }

    return {
      referralCode: user.referralCode,
      type: user.referralType || 'normal',
      percentage: user.referralType === 'influencer' 
        ? parseFloat(user.influencerPercentage) 
        : 5,
      balance: parseFloat(user.referralBalance) || 0,
      totalEarnings: parseFloat(user.totalReferralEarnings) || 0,
      referralCount: user.referralCount || 0
    };

  } catch (error) {
    console.error('❌ Get referral summary error:', error);
    return null;
  }
};

module.exports = {
  processReferralCommission,
  shouldTriggerFirstBetCommission,
  getReferrerCommissionRate,
  getUserReferralSummary
};
