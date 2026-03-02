
// models/BankAccount.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BankAccount = sequelize.define('BankAccount', {
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
    },
    onDelete: 'CASCADE'
  },
  accountNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      is: /^\d{10}$/,
      len: [10, 10]
    }
  },
  accountName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  bankCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  bankName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bank_accounts',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['userId', 'accountNumber', 'bankCode'],
      unique: true,
      name: 'unique_account_per_user'
    },
    {
      fields: ['userId', 'isDefault'],
      where: {
        isDefault: true
      }
    }
  ]
});

// =====================================================
// INSTANCE METHODS
// =====================================================

/**
 * Mark this account as default
 */
BankAccount.prototype.setAsDefault = async function() {
  const transaction = await sequelize.transaction();
  
  try {
    // Remove default from all user's accounts
    await BankAccount.update(
      { isDefault: false },
      { 
        where: { userId: this.userId },
        transaction 
      }
    );
    
    // Set this account as default
    this.isDefault = true;
    await this.save({ transaction });
    
    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update last used timestamp
 */
BankAccount.prototype.markAsUsed = async function() {
  this.lastUsedAt = new Date();
  return await this.save();
};

/**
 * Verify account
 */
BankAccount.prototype.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  return await this.save();
};

// =====================================================
// CLASS METHODS
// =====================================================

/**
 * Get default account for user
 */
BankAccount.getDefaultAccount = async function(userId) {
  return await this.findOne({
    where: {
      userId,
      isDefault: true
    }
  });
};

/**
 * Get all accounts for user
 */
BankAccount.getUserAccounts = async function(userId) {
  return await this.findAll({
    where: { userId },
    order: [
      ['isDefault', 'DESC'],
      ['lastUsedAt', 'DESC NULLS LAST'],
      ['createdAt', 'DESC']
    ]
  });
};

/**
 * Check if account exists for user
 */
BankAccount.accountExists = async function(userId, accountNumber, bankCode) {
  const count = await this.count({
    where: {
      userId,
      accountNumber,
      bankCode
    }
  });
  return count > 0;
};

module.exports = BankAccount;
