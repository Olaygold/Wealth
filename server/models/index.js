
// models/index.js
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Round = require('./Round');
const Bet = require('./Bet');
const VirtualAccount = require('./VirtualAccount');
const PendingDeposit = require('./PendingDeposit');
const ReferralEarning = require('./ReferralEarning'); // ✅ NEW

// =====================================================
// DEFINE ALL ASSOCIATIONS
// =====================================================

// User <-> Wallet (One-to-One)
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Transactions (One-to-Many)
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Bets (One-to-Many)
User.hasMany(Bet, { foreignKey: 'userId', as: 'bets' });
Bet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Round <-> Bets (One-to-Many)
Round.hasMany(Bet, { foreignKey: 'roundId', as: 'bets' });
Bet.belongsTo(Round, { foreignKey: 'roundId', as: 'round' });

// User <-> PendingDeposits (One-to-Many)
User.hasMany(PendingDeposit, { foreignKey: 'userId', as: 'pendingDeposits' });
PendingDeposit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// VirtualAccount <-> PendingDeposits (One-to-Many)
VirtualAccount.hasMany(PendingDeposit, { foreignKey: 'virtualAccountId', as: 'deposits' });
PendingDeposit.belongsTo(VirtualAccount, { foreignKey: 'virtualAccountId', as: 'virtualAccount' });

// ✅ USER SELF-REFERRAL
User.hasMany(User, { foreignKey: 'referredBy', as: 'referrals' });
User.belongsTo(User, { foreignKey: 'referredBy', as: 'referrer' });

// ✅ NEW: REFERRAL EARNINGS ASSOCIATIONS
// User as Referrer -> Many ReferralEarnings
User.hasMany(ReferralEarning, { foreignKey: 'referrerId', as: 'referralEarnings' });
ReferralEarning.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });

// User as Referred -> Many ReferralEarnings
User.hasMany(ReferralEarning, { foreignKey: 'referredUserId', as: 'earningsFromMe' });
ReferralEarning.belongsTo(User, { foreignKey: 'referredUserId', as: 'referredUser' });

// Bet -> Many ReferralEarnings
Bet.hasMany(ReferralEarning, { foreignKey: 'betId', as: 'referralEarnings' });
ReferralEarning.belongsTo(Bet, { foreignKey: 'betId', as: 'bet' });

module.exports = {
  User,
  Wallet,
  Transaction,
  Round,
  Bet,
  VirtualAccount,
  PendingDeposit,
  ReferralEarning // ✅ NEW
};
