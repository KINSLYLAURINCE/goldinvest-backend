const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Portfolio = sequelize.define('Portfolio', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:         { type: DataTypes.UUID, allowNull: false },
  goldQuantityOz: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0 },
  totalInvested:  { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  currentValue:   { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
  profitLoss:     { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
}, { tableName: 'portfolios', timestamps: true });

module.exports = Portfolio;
