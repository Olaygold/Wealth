
// server/models/ReferralEarning.js
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
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  referredUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  betId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Bets',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('first_bet', 'loss_commission', 'signup_bonus'),
    allowNull: false
  },
  betAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  earnedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'completed'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'referral_earnings',
  timestamps: true,
  indexes: [
    { fields: ['referrerId'] },
    { fields: ['referredUserId'] },
    { fields: ['betId'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ReferralEarning;
