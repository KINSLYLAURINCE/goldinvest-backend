const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Commission = sequelize.define('Commission', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:        { type: DataTypes.UUID, allowNull: false }, // le parrain qui reçoit
  fromUserId:    { type: DataTypes.UUID, allowNull: false }, // le filleul qui a déposé
  transactionId: { type: DataTypes.UUID, allowNull: false },
  level:         { type: DataTypes.INTEGER, allowNull: false }, // 1, 2 ou 3
  rate:          { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  amount:        { type: DataTypes.DECIMAL(18, 2), allowNull: false },
}, { tableName: 'commissions', timestamps: true });

module.exports = Commission;