const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'User'
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verified: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: false,
  defaultScope: {
    // exclude password hash by default
    attributes: { exclude: ['passwordHash'] }
  },
  scopes: {
    // include hash when needed for auth
    withHash: { attributes: {} }
  }
});

// Virtual field: isVerified
Account.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.isVerified = !!(values.verified || values.verificationToken === null);
  delete values.passwordHash;
  delete values.verificationToken;
  delete values.resetToken;
  delete values.resetTokenExpires;
  return values;
};

module.exports = Account;
