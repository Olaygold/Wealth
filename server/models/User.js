
// models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  kycStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  kycDocuments: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  referralCode: {
    type: DataTypes.STRING(20),
    unique: true
  },
  referredBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // ✅ NEW REFERRAL SYSTEM FIELDS
  referralType: {
    type: DataTypes.ENUM('normal', 'influencer'),
    defaultValue: 'normal',
    allowNull: false
  },
  influencerPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false
  },
  referralBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  totalReferralEarnings: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  referralCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  hasPlacedFirstBet: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  // END NEW FIELDS
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'users',
  underscored: false,
  indexes: [
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['referralCode'] },
    { fields: ['referredBy'] } // ✅ Added index
  ]
});

// ✅ UPDATED: Define associations (called from models/index.js)
User.associate = function(models) {
  // Self-referential: A user can refer many users
  User.hasMany(models.User, {
    as: 'referrals',
    foreignKey: 'referredBy'
  });

  // Self-referential: A user can be referred by one user
  User.belongsTo(models.User, {
    as: 'referrer',
    foreignKey: 'referredBy'
  });

  // User <-> Wallet
  User.hasOne(models.Wallet, {
    foreignKey: 'userId',
    as: 'wallet'
  });

  // User <-> Bets
  User.hasMany(models.Bet, {
    foreignKey: 'userId',
    as: 'bets'
  });

  // User <-> Transactions
  User.hasMany(models.Transaction, {
    foreignKey: 'userId',
    as: 'transactions'
  });

  // User <-> PendingDeposits
  User.hasMany(models.PendingDeposit, {
    foreignKey: 'userId',
    as: 'pendingDeposits'
  });

  // ✅ NEW: User <-> ReferralEarnings (as referrer)
  User.hasMany(models.ReferralEarning, {
    foreignKey: 'referrerId',
    as: 'referralEarnings'
  });

  // ✅ NEW: User <-> ReferralEarnings (as referred user)
  User.hasMany(models.ReferralEarning, {
    foreignKey: 'referredUserId',
    as: 'earningsFromMe'
  });
};

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  
  // Generate referral code
  if (!user.referralCode) {
    user.referralCode = `REF${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  return values;
};

module.exports = User;
