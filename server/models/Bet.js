const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  roundId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rounds',
      key: 'id'
    }
  },
  prediction: {
    type: DataTypes.ENUM('up', 'down'),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Amount user paid (including fee)'
  },
  feeAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '20% platform fee'
  },
  stakeAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Amount added to pool (totalAmount - feeAmount)'
  },
  result: {
    type: DataTypes.ENUM('win', 'loss', 'refund', 'pending'),
    defaultValue: 'pending'
  },
  payout: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: 'Amount won (stake + share of prize pool)'
  },
  profit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: 'Net profit/loss (payout - totalAmount)'
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // server/models/Bet.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  roundId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  prediction: {
    type: DataTypes.ENUM('up', 'down'),
    allowNull: false
  },
  stakeAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  entryPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  result: {
    type: DataTypes.ENUM('pending', 'win', 'loss', 'refund'),
    defaultValue: 'pending'
  },
  payout: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  profit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isBot: {  // ✅ ADD THIS FIELD
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if this bet was placed by the bot system'
  }
}, {
  timestamps: true,
  tableName: 'bets',
  indexes: [
    { fields: ['userId'] },
    { fields: ['roundId'] },
    { fields: ['prediction'] },
    { fields: ['result'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Bet;
