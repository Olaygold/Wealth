// models/VirtualAccount.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VirtualAccount = sequelize.define('VirtualAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accountNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  accountName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bankCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '100004'
  },
  provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'aspfiy'
  },
  aspfiyReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastAssignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalUsage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'virtual_accounts',
  underscored: true
});

module.exports = VirtualAccount;
