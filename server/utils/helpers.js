// Calculate platform fee (20%)
const calculatePlatformFee = (amount) => {
  const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 20;
  return (amount * feePercentage) / 100;
};

// Calculate stake after fee deduction
const calculateStakeAmount = (totalAmount) => {
  const fee = calculatePlatformFee(totalAmount);
  return totalAmount - fee;
};

// Calculate platform cut from losers pool (30%)
const calculatePlatformCut = (losersPool) => {
  const cutPercentage = parseFloat(process.env.LOSERS_POOL_PLATFORM_CUT) || 30;
  return (losersPool * cutPercentage) / 100;
};

// Calculate prize pool for winners (70% of losers pool)
const calculatePrizePool = (losersPool) => {
  const platformCut = calculatePlatformCut(losersPool);
  return losersPool - platformCut;
};

// Calculate individual winner's share
const calculateWinnerPayout = (userStake, totalWinningStakes, prizePool) => {
  // Winner gets their stake back + proportional share of prize pool
  const shareRatio = userStake / totalWinningStakes;
  const prizeShare = prizePool * shareRatio;
  return userStake + prizeShare;
};

// Format currency
const formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Generate random reference code
const generateReference = (prefix = 'REF') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Validate bet amount
const validateBetAmount = (amount) => {
  const minBet = parseFloat(process.env.MIN_BET_AMOUNT) || 100;
  const maxBet = parseFloat(process.env.MAX_BET_AMOUNT) || 100000;
  
  if (amount < minBet) {
    return { valid: false, message: `Minimum bet is ₦${minBet}` };
  }
  
  if (amount > maxBet) {
    return { valid: false, message: `Maximum bet is ₦${maxBet}` };
  }
  
  return { valid: true };
};

// Calculate profit/loss
const calculateProfit = (payout, totalAmount) => {
  return payout - totalAmount;
};

// Round to 2 decimal places
const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

module.exports = {
  calculatePlatformFee,
  calculateStakeAmount,
  calculatePlatformCut,
  calculatePrizePool,
  calculateWinnerPayout,
  formatCurrency,
  generateReference,
  validateBetAmount,
  calculateProfit,
  roundToTwo
};
