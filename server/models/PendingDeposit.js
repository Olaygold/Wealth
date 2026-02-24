
// models/PendingDeposit.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PendingDeposit = sequelize.define('PendingDeposit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  virtualAccountId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'expired', 'cancelled'),
    defaultValue: 'pending'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  webhookData: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'pending_deposits',
  underscored: false  // Keep camelCase - matches your database
});

module.exports = PendingDeposit;
