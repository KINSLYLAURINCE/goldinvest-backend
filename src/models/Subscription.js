const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  planId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  planName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  processing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  dailyRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  dailyGain: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  nextGainDate: {
    // Nullable: une souscription "completed" n'a plus de prochaine échéance.
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalGainPaid: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  daysCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active',
  },
}, {
  tableName: 'subscriptions',
  timestamps: true,
});

module.exports = Subscription;