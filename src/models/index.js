const User         = require('./User.model');
const Portfolio     = require('./Portfolio.model');
const Transaction   = require('./Transaction.model');
const GoldPrice      = require('./GoldPrice.model');
const Admin          = require('./Admin');
const Subscription  = require('./Subscription');
const Commission    = require('./Commission.model'); // ✅ PARRAINAGE

// ---- Associations existantes ----
User.hasOne(Portfolio, { foreignKey: 'userId', as: 'portfolio' });
Portfolio.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

// ✅ PARRAINAGE — un user peut avoir un parrain (auto-référence)
User.belongsTo(User, { foreignKey: 'referredBy', as: 'parrain' });
User.hasMany(User, { foreignKey: 'referredBy', as: 'filleuls' });

// ✅ PARRAINAGE — commissions reçues
User.hasMany(Commission, { foreignKey: 'userId', as: 'commissionsRecues' });
Commission.belongsTo(User, { foreignKey: 'userId', as: 'beneficiaire' });
Commission.belongsTo(User, { foreignKey: 'fromUserId', as: 'filleulSource' });
Commission.belongsTo(Transaction, { foreignKey: 'transactionId' });

module.exports = { User, Portfolio, Transaction, GoldPrice, Admin, Subscription, Commission };