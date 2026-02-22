
// Calculate platform fee (20%)
const calculatePlatformFee = (amount) => {
  const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 20;
  const parsedAmount = parseFloat(amount) || 0;
  return roundToTwo((parsedAmount * feePercentage) / 100);
};

// Calculate stake after fee deduction
const calculateStakeAmount = (totalAmount) => {
  const parsedAmount = parseFloat(totalAmount) || 0;
  const fee = calculatePlatformFee(parsedAmount);
  return roundToTwo(parsedAmount - fee);
};

// Calculate platform cut from losers pool (30%)
const calculatePlatformCut = (losersPool) => {
  const cutPercentage = parseFloat(process.env.LOSERS_POOL_PLATFORM_CUT) || 30;
  const parsedPool = parseFloat(losersPool) || 0;
  return roundToTwo((parsedPool * cutPercentage) / 100);
};

// Calculate prize pool for winners (70% of losers pool)
const calculatePrizePool = (losersPool) => {
  const parsedPool = parseFloat(losersPool) || 0;
  const platformCut = calculatePlatformCut(parsedPool);
  return roundToTwo(parsedPool - platformCut);
};

// Calculate individual winner's share
const calculateWinnerPayout = (userStake, totalWinningStakes, prizePool) => {
  const parsedStake = parseFloat(userStake) || 0;
  const parsedTotal = parseFloat(totalWinningStakes) || 1; // Prevent division by zero
  const parsedPool = parseFloat(prizePool) || 0;
  
  // Winner gets their stake back + proportional share of prize pool
  const shareRatio = parsedStake / parsedTotal;
  const prizeShare = parsedPool * shareRatio;
  return roundToTwo(parsedStake + prizeShare);
};

// Format currency
const formatCurrency = (amount, currency = 'NGN') => {
  const parsedAmount = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsedAmount);
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
  const parsedAmount = parseFloat(amount);
  
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, message: 'Invalid bet amount' };
  }
  
  if (parsedAmount < minBet) {
    return { valid: false, message: `Minimum bet is ₦${minBet.toLocaleString()}` };
  }
  
  if (parsedAmount > maxBet) {
    return { valid: false, message: `Maximum bet is ₦${maxBet.toLocaleString()}` };
  }
  
  return { valid: true };
};

// Calculate profit/loss
const calculateProfit = (payout, totalAmount) => {
  const parsedPayout = parseFloat(payout) || 0;
  const parsedTotal = parseFloat(totalAmount) || 0;
  return roundToTwo(parsedPayout - parsedTotal);
};

// Round to 2 decimal places
const roundToTwo = (num) => {
  const parsed = parseFloat(num) || 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

// Format time remaining
const formatTimeRemaining = (milliseconds) => {
  if (milliseconds <= 0) return '00:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Check if round is bettable
const isRoundBettable = (round) => {
  if (!round) return false;
  
  const now = new Date();
  const lockTime = new Date(round.lockTime);
  
  return round.status === 'active' && now < lockTime;
};

// Calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
  const parsed Old = parseFloat(oldValue) || 0;
  const parsedNew = parseFloat(newValue) || 0;
  
  if (parsedOld === 0) return 0;
  
  return roundToTwo(((parsedNew - parsedOld) / parsedOld) * 100);
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
  roundToTwo,
  formatTimeRemaining,
  isRoundBettable,
  calculatePercentageChange
};
