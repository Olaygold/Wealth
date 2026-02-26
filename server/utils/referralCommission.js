// utils/referralCommission.js
const { User, ReferralEarning } = require('../models');

/**
 * Process referral commission when a bet is placed or lost
 * 
 * @param {string} userId - The user who placed the bet
 * @param {string} betId - The bet ID
 * @param {number} betAmount - The bet amount
 * @param {string} action - 'first_bet' or 'bet_lost'
 * @param {Transaction} dbTransaction - Sequelize transaction
 * @returns {Promise<Object|null>} Commission details or null
 */
const processReferralCommission = async (userId, betId, betAmount, action, dbTransaction) => {
  try {
    // Get the user who placed the bet with their referrer
    const user = await User.findByPk(userId, {
      include: [{
        model: User,
        as: 'referrer',
        attributes: ['id', 'username', 'referralType', 'influencerPercentage', 'referralBalance', 'totalReferralEarnings']
      }],
      transaction: dbTransaction
    });

    // No referrer = no commission
    if (!user || !user.referredBy || !user.referrer) {
      return null;
    }

    const referrer = user.referrer;
    let commission = 0;
    let commissionType = null;
    let percentage = 0;

    // =====================================================
    // NORMAL REFERRER: 5% of FIRST BET only
    // =====================================================
    if (referrer.referralType === 'normal') {
      // Only pay commission on the very first bet
      if (action === 'first_bet' && !user.hasPlacedFirstBet) {
        percentage = 5;
        commission = betAmount * (percentage / 100); // 5% of bet amount
        commissionType = 'first_bet';

        // Mark user as having placed first bet (prevents duplicate payments)
        await user.update({
          hasPlacedFirstBet: true
        }, { transaction: dbTransaction });

        console.log(`💰 Normal Referral: ${referrer.username} earns ${percentage}% of ${user.username}'s first bet`);
      }
    }
    
    // =====================================================
    // INFLUENCER: X% of EVERY LOSS
    // =====================================================
    else if (referrer.referralType === 'influencer') {
      // Only pay commission when the bet LOSES
      if (action === 'bet_lost') {
        percentage = parseFloat(referrer.influencerPercentage);
        
        // Safety check
        if (percentage < 0 || percentage > 10) {
          console.error(`❌ Invalid influencer percentage: ${percentage}% for ${referrer.username}`);
          return null;
        }

        commission = betAmount * (percentage / 100);
        commissionType = 'loss_commission';

        console.log(`💰 Influencer Commission: ${referrer.username} earns ${percentage}% of ${user.username}'s loss`);
      }
    }

    // =====================================================
    // PAY THE COMMISSION
    // =====================================================
    if (commission > 0 && commissionType) {
      // Round to 2 decimal places
      commission = Math.round(commission * 100) / 100;

      // Create earning record
      const earning = await ReferralEarning.create({
        referrerId: referrer.id,
        referredUserId: userId,
        betId,
        type: commissionType,
        percentage,
        betAmount,
        earnedAmount: commission,
        status: 'credited'
      }, { transaction: dbTransaction });

      // Update referrer's balances
      const newReferralBalance = parseFloat(referrer.referralBalance || 0) + commission;
      const newTotalEarnings = parseFloat(referrer.totalReferralEarnings || 0) + commission;

      await referrer.update({
        referralBalance: newReferralBalance,
        totalReferralEarnings: newTotalEarnings
      }, { transaction: dbTransaction });

      console.log(`✅ Referral Commission Paid:
        Referrer: ${referrer.username}
        Referred: ${user.username}
        Type: ${commissionType}
        Bet Amount: ₦${betAmount.toLocaleString()}
        Commission: ₦${commission.toFixed(2)} (${percentage}%)
        New Balance: ₦${newReferralBalance.toFixed(2)}
      `);

      return {
        earningId: earning.id,
        referrerId: referrer.id,
        referrerUsername: referrer.username,
        referredUserId: userId,
        referredUsername: user.username,
        type: commissionType,
        percentage,
        betAmount,
        commission,
        newReferralBalance
      };
    }

    return null;

  } catch (error) {
    console.error('❌ Referral commission processing error:', error);
    // Don't throw - just log and return null so bet processing can continue
    // The bet should not fail just because commission failed
    return null;
  }
};

/**
 * Check if user should trigger first bet commission
 * (Helper function)
 * 
 * @param {string} userId - User ID
 * @param {Transaction} dbTransaction - Sequelize transaction
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
 * Get referrer's commission rate
 * (Helper function)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} { type: 'normal'|'influencer', percentage: number }
 */
const getReferrerCommissionRate = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: [{
        model: User,
        as: 'referrer',
        attributes: ['referralType', 'influencerPercentage']
      }]
    });

    if (!user || !user.referrer) {
      return null;
    }

    const referrer = user.referrer;

    if (referrer.referralType === 'influencer') {
      return {
        type: 'influencer',
        percentage: parseFloat(referrer.influencerPercentage)
      };
    }

    return {
      type: 'normal',
      percentage: 5
    };

  } catch (error) {
    console.error('❌ Get commission rate error:', error);
    return null;
  }
};

module.exports = {
  processReferralCommission,
  shouldTriggerFirstBetCommission,
  getReferrerCommissionRate
};
