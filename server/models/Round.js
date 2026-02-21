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
    unique: true,
    autoIncrement: true
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
