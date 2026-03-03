
// server/services/referralService.js
const { User, Wallet, ReferralEarning, Transaction } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Process influencer commission when a referred user loses a bet
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
      console.log(`   ℹ️ Referrer ${referrer.username} is not an influencer (type: ${referrer.referralType || 'normal'})`);
      return null;
    }

    // Step 4: Get commission percentage
    const commissionPercentage = parseFloat(referrer.influencerPercentage) || 0;
    
    if (commissionPercentage <= 0) {
      console.log(`   ℹ️ Influencer ${referrer.username} has 0% commission rate`);
      return null;
    }

    // Step 5: Calculate commission
    const commissionAmount = Math.round((parseFloat(lossAmount) * commissionPercentage) / 100 * 100) / 100;

    if (commissionAmount <= 0) {
      console.log(`   ℹ️ Commission amount is 0`);
      return null;
    }

    console.log(`   ✅ Influencer found: ${referrer.username}`);
    console.log(`   📊 Commission Rate: ${commissionPercentage}%`);
    console.log(`   💵 Commission Amount: ₦${commissionAmount.toFixed(2)}`);

    // Step 6: Check for duplicates
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

    // Step 7: Create referral earning record
    const earning = await ReferralEarning.create({
      referrerId: referrer.id,
      referredUserId: loserId,
      betId: betId,
      type: 'loss_commission',
      betAmount: parseFloat(lossAmount),
      percentage: commissionPercentage,
      earnedAmount: commissionAmount,
      status: 'completed',
      description: `${commissionPercentage}% commission on ${loser.username}'s lost bet of ₦${lossAmount}`
    }, { transaction: dbTransaction });

    console.log(`   ✅ ReferralEarning created (ID: ${earning.id})`);

    // Step 8: Update influencer's referral balance
    const currentBalance = parseFloat(referrer.referralBalance) || 0;
    const currentTotalEarnings = parseFloat(referrer.totalReferralEarnings) || 0;
    const newBalance = Math.round((currentBalance + commissionAmount) * 100) / 100;
    const newTotalEarnings = Math.round((currentTotalEarnings + commissionAmount) * 100) / 100;

    await User.update({
      referralBalance: newBalance,
      totalReferralEarnings: newTotalEarnings
    }, {
      where: { id: referrer.id },
      transaction: dbTransaction
    });

    console.log(`   ✅ Influencer balance updated: ₦${currentBalance.toFixed(2)} → ₦${newBalance.toFixed(2)}`);

    // Step 9: Create transaction record
    const transactionRef = `REF-COMM-${betId.substring(0, 8)}-${Date.now()}`;
    
    await Transaction.create({
      userId: referrer.id,
      type: 'referral_commission',
      method: 'internal',
      amount: commissionAmount,
      currency: 'NGN',
      status: 'completed',
      description: `Influencer commission: ${commissionPercentage}% of ₦${lossAmount} from ${loser.username}'s loss`,
      reference: transactionRef,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
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
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process first bet bonus for normal referrers (not influencers)
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
      console.log(`   ✅ Marked ${bettor.username} as hasPlacedFirstBet = true`);
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
      console.log(`   ✅ Marked ${bettor.username} as hasPlacedFirstBet = true`);
      return null;
    }

    // Check for duplicate
    const existingEarning = await ReferralEarning.findOne({
      where: { 
        betId: betId,
        referrerId: referrer.id,
        type: 'first_bet'
      },
      transaction: dbTransaction
    });

    if (existingEarning) {
      console.log(`   ⚠️ First bet bonus already processed for this bet`);
      await User.update(
        { hasPlacedFirstBet: true },
        { where: { id: bettorId }, transaction: dbTransaction }
      );
      return {
        success: true,
        alreadyProcessed: true,
        earningId: existingEarning.id
      };
    }

    // Normal referrer - give 5% first bet bonus
    const bonusPercentage = 25;
    const bonusAmount = Math.round((parseFloat(betAmount) * bonusPercentage) / 100 * 100) / 100;

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

    const newBalance = Math.round((currentBalance + bonusAmount) * 100) / 100;
    const newTotalEarnings = Math.round((currentTotalEarnings + bonusAmount) * 100) / 100;

    await User.update({
      referralBalance: newBalance,
      totalReferralEarnings: newTotalEarnings,
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

    console.log(`   ✅ Marked ${bettor.username} as hasPlacedFirstBet = true`);

    // Create transaction
    const transactionRef = `REF-BONUS-${betId.substring(0, 8)}-${Date.now()}`;
    
    await Transaction.create({
      userId: referrer.id,
      type: 'referral_bonus',
      method: 'internal',
      amount: bonusAmount,
      currency: 'NGN',
      status: 'completed',
      description: `First bet bonus from ${bettor.username}`,
      reference: transactionRef,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
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
      bettorId: bettorId,
      bettorUsername: bettor.username,
      betAmount: parseFloat(betAmount),
      bonusPercentage: bonusPercentage,
      bonusAmount: bonusAmount,
      newReferralBalance: newBalance,
      earningId: earning.id
    };

  } catch (error) {
    console.error('❌ Error processing first bet bonus:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get referral dashboard data for a user
 * 
 * @param {string} userId - User ID
 * @returns {object} Dashboard data
 */
const getDashboardData = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'referralCode', 'referralType',
        'influencerPercentage', 'referralBalance', 
        'totalReferralEarnings', 'referralCount'
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get referred users
    const referredUsers = await User.findAll({
      where: { referredBy: userId },
      attributes: [
        'id', 'username', 'createdAt', 'isActive', 'hasPlacedFirstBet'
      ],
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['totalDeposited']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Get recent earnings
    const recentEarnings = await ReferralEarning.findAll({
      where: { referrerId: userId },
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['username']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get stats
    const stats = await ReferralEarning.findAll({
      where: { referrerId: userId, status: 'completed' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('earnedAmount')), 'totalEarned']
      ],
      raw: true
    });

    const isInfluencer = user.referralType === 'influencer';
    const percentage = isInfluencer ? (parseFloat(user.influencerPercentage) || 0) : 25;

    const baseUrl = process.env.FRONTEND_URL || 'https://yoursite.com';

    return {
      referralCode: user.referralCode,
      referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
      referralType: user.referralType || 'normal',
      percentage: percentage,
      referralBalance: parseFloat(user.referralBalance) || 0,
      totalEarnings: parseFloat(user.totalReferralEarnings) || 0,
      referralCount: user.referralCount || 0,
      explanation: isInfluencer 
        ? `You earn ${percentage}% commission on every loss from your referrals`
        : 'You earn 25% bonus when your referrals place their first bet',
      referredUsers: referredUsers.map(u => ({
        id: u.id,
        username: u.username,
        joinedAt: u.createdAt,
        isActive: u.isActive,
        hasPlacedBet: u.hasPlacedFirstBet,
        totalDeposited: parseFloat(u.wallet?.totalDeposited) || 0
      })),
      recentEarnings: recentEarnings.map(e => ({
        id: e.id,
        username: e.referredUser?.username || 'Unknown',
        type: e.type,
        typeLabel: e.type === 'first_bet' ? 'First Bet Bonus' : 'Loss Commission',
        betAmount: parseFloat(e.betAmount) || 0,
        earnedAmount: parseFloat(e.earnedAmount) || 0,
        percentage: e.percentage,
        createdAt: e.createdAt
      })),
      stats: {
        totalTransactions: parseInt(stats[0]?.totalTransactions) || 0,
        totalEarned: parseFloat(stats[0]?.totalEarned) || 0
      }
    };

  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    throw error;
  }
};

/**
 * Withdraw referral balance to main wallet
 * 
 * @param {string} userId - User ID
 * @param {number} amount - Amount to withdraw
 * @returns {object} Result
 */
const withdrawToWallet = async (userId, amount) => {
  const transaction = await sequelize.transaction();
  
  try {
    amount = parseFloat(amount);
    
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (amount < 100) {
      throw new Error('Minimum withdrawal is ₦100');
    }

    // Get user with lock
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'referralBalance'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentReferralBalance = parseFloat(user.referralBalance) || 0;

    if (amount > currentReferralBalance) {
      throw new Error('Insufficient referral balance');
    }

    // Get wallet with lock
    const wallet = await Wallet.findOne({
      where: { userId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentWalletBalance = parseFloat(wallet.nairaBalance) || 0;
    const newReferralBalance = Math.round((currentReferralBalance - amount) * 100) / 100;
    const newWalletBalance = Math.round((currentWalletBalance + amount) * 100) / 100;

    // Update user referral balance
    await User.update({
      referralBalance: newReferralBalance
    }, {
      where: { id: userId },
      transaction
    });

    // Update wallet balance
    await Wallet.update({
      nairaBalance: newWalletBalance
    }, {
      where: { userId },
      transaction
    });

    // Create transaction record
    const transactionRef = `REF-WD-${userId.substring(0, 8)}-${Date.now()}`;
    
    await Transaction.create({
      userId: userId,
      type: 'referral_withdrawal',
      method: 'internal',
      amount: amount,
      currency: 'NGN',
      status: 'completed',
      description: `Transferred ₦${amount.toLocaleString()} from referral balance to wallet`,
      reference: transactionRef,
      balanceBefore: currentWalletBalance,
      balanceAfter: newWalletBalance,
      metadata: {
        referralBalanceBefore: currentReferralBalance,
        referralBalanceAfter: newReferralBalance,
        walletBalanceBefore: currentWalletBalance,
        walletBalanceAfter: newWalletBalance
      }
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Referral withdrawal: ${user.username} transferred ₦${amount} to wallet`);
    console.log(`   Referral: ₦${currentReferralBalance} → ₦${newReferralBalance}`);
    console.log(`   Wallet: ₦${currentWalletBalance} → ₦${newWalletBalance}`);

    return {
      success: true,
      amount: amount,
      newReferralBalance: newReferralBalance,
      newWalletBalance: newWalletBalance,
      message: `Successfully transferred ₦${amount.toLocaleString()} to your wallet`
    };

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error withdrawing referral balance:', error);
    throw error;
  }
};

module.exports = {
  processInfluencerCommission,
  processFirstBetBonus,
  getDashboardData,
  withdrawToWallet
};
