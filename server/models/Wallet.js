const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  nairaBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  cryptoBalance: {
    type: DataTypes.DECIMAL(18, 8),
    defaultValue: 0.00000000,
    validate: {
      min: 0
    }
  },
  lockedBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    comment: 'Money in active bets'
  },
  totalDeposited: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalWithdrawn: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalWon: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  totalLost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  }
}, {
  timestamps: true,
  tableName: 'wallets',
  indexes: [
    { fields: ['userId'] }
  ]
});

module.exports = Wallet;
