const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GoldPrice = sequelize.define('GoldPrice', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  priceUSD:    { type: DataTypes.DECIMAL(18, 4), allowNull: false }, // prix par once troy
  openPrice:   { type: DataTypes.DECIMAL(18, 4) },
  highPrice:   { type: DataTypes.DECIMAL(18, 4) },
  lowPrice:    { type: DataTypes.DECIMAL(18, 4) },
  change:      { type: DataTypes.DECIMAL(10, 4) },
  changePct:   { type: DataTypes.DECIMAL(10, 4) },
  fetchedAt:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'gold_prices', timestamps: false });

module.exports = GoldPrice;
