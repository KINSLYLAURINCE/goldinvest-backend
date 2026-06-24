const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  firstName:    { type: DataTypes.STRING(100), allowNull: false },
  lastName:     { type: DataTypes.STRING(100), allowNull: false },
  email:        { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password:     { type: DataTypes.STRING, allowNull: false },
  role:         { type: DataTypes.ENUM('investor', 'admin'), defaultValue: 'investor' },
  isVerified:   { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
  balance:      { type: DataTypes.DECIMAL(18, 2), defaultValue: 0.00 },
  refreshToken: { type: DataTypes.TEXT, allowNull: true },

  // ✅ PARRAINAGE
  referralCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  referredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  hasDeposited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

}, { tableName: 'users', timestamps: true, paranoid: true });

module.exports = User;