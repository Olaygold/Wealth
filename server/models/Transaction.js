const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'bet_place', 'bet_win', 'bet_loss', 'fee', 'refund'),
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('naira', 'crypto', 'internal'),
    defaultValue: 'naira'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'NGN'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  reference: {
    type: DataTypes.STRING(100),
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Payment gateway response, etc.'
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'transactions',
  indexes: [
    { fields: ['userId'] },
    { fields: ['reference'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

// Generate unique reference
Transaction.beforeCreate(async (transaction) => {
  if (!transaction.reference) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    transaction.reference = `TXN${timestamp}${random}`;
  }
});

module.exports = Transaction;
