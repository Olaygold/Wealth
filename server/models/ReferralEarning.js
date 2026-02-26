
// models/ReferralEarning.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReferralEarning = sequelize.define('ReferralEarning', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  referrerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The user who referred and earned the commission'
  },
  referredUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The user who was referred and placed the bet'
  },
  betId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The bet that triggered this earning'
  },
  type: {
    type: DataTypes.ENUM('first_bet', 'loss_commission'),
    allowNull: false,
    comment: 'first_bet = normal referrer (5% once), loss_commission = influencer (X% every loss)'
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'The percentage used to calculate commission'
  },
  betAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'The original bet amount'
  },
  earnedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'The commission earned (betAmount * percentage / 100)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'credited', 'withdrawn'),
    defaultValue: 'credited',
    comment: 'pending = awaiting, credited = added to balance, withdrawn = moved to wallet'
  }
}, {
  timestamps: true,
  tableName: 'referral_earnings',
  underscored: false,
  indexes: [
    { fields: ['referrerId'] },
    { fields: ['referredUserId'] },
    { fields: ['betId'] },
    { fields: ['type'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ReferralEarning;
