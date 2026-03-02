// models/BankAccount.js
module.exports = (sequelize, DataTypes) => {
  const BankAccount = sequelize.define('BankAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    accountNumber: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        is: /^\d{10}$/
      }
    },
    accountName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    bankCode: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: false
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
      { fields: ['userId'] },
      { fields: ['accountNumber', 'bankCode'], unique: true }
    ]
  });

  BankAccount.associate = (models) => {
    BankAccount.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return BankAccount;
};
