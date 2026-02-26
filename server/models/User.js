
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
  indexes: [
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['referralCode'] }
  ]
});

// ✅ ADD THIS: Define associations
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

  // Other associations
  User.hasOne(models.Wallet, {
    foreignKey: 'userId',
    as: 'wallet'
  });

  User.hasMany(models.Bet, {
    foreignKey: 'userId',
    as: 'bets'
  });

  User.hasMany(models.Transaction, {
    foreignKey: 'userId',
    as: 'transactions'
  });

  User.hasMany(models.PendingDeposit, {
    foreignKey: 'userId',
    as: 'pendingDeposits'
  });

  User.hasMany(models.VirtualAccount, {
    foreignKey: 'userId',
    as: 'virtualAccounts'
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
    user.referralCode = `WLT${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
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
  return values;
};

module.exports = User;
