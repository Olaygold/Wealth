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
      model: 'Users',
      key: 'id'
    }
  },
  roundId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Rounds',
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
