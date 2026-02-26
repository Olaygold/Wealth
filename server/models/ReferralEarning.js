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
    allowNull: false
  },
  referredUserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  betId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('first_bet', 'loss_commission'),
    allowNull: false
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  betAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  earnedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'credited', 'withdrawn'),
    defaultValue: 'credited'
  }
}, {
  timestamps: true,
  tableName: 'referral_earnings',
  underscored: false
});

module.exports = ReferralEarning;
