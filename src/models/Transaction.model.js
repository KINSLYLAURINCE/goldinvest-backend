const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:         { type: DataTypes.UUID, allowNull: false },
  type:           { type: DataTypes.ENUM('buy', 'sell', 'deposit', 'withdrawal'), allowNull: false },
  goldQuantityOz: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  pricePerOz:     { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  totalAmount:    { type: DataTypes.DECIMAL(18, 2), allowNull: false },
  amount:         { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  fees:           { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },
  amountReceived: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  status:         { type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'), defaultValue: 'pending' },
  currency:       { type: DataTypes.STRING(10), defaultValue: 'XAF' },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  method:         { type: DataTypes.STRING, allowNull: true },
  proofUrl:       { type: DataTypes.STRING, allowNull: true },
  operator:       { type: DataTypes.STRING, allowNull: true },
  phoneNumber:    { type: DataTypes.STRING, allowNull: true },
  accountName:    { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'transactions', timestamps: true });

module.exports = Transaction;