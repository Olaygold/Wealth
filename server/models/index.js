
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Round = require('./Round');
const Bet = require('./Bet');

// Define relationships AFTER all models are loaded

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

// User self-referral (OPTIONAL - add this later if needed)
// User.hasMany(User, { foreignKey: 'referredBy', as: 'referrals' });
// User.belongsTo(User, { foreignKey: 'referredBy', as: 'referrer' });

module.exports = {
  User,
  Wallet,
  Transaction,
  Round,
  Bet
};
