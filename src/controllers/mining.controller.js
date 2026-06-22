const sequelize = require('../config/database');
const { success, error } = require('../utils/apiResponse');
const { Op, DataTypes } = require('sequelize');

const MINING_TIERS = {
  m1: { id: 'm1', months: 1, rate: 150, label: '1 mois' },
  m2: { id: 'm2', months: 2, rate: 300, label: '2 mois' },
  m3: { id: 'm3', months: 3, rate: 600, label: '3 mois' },
};

// Fonction interne pour récupérer les modèles de manière 100% fiable
const getModels = () => {
  // 1. Chargement/Initialisation manuelle de MiningSession s'il n'existe pas encore
  let MiningSession = sequelize.models.MiningSession;
  if (!MiningSession) {
    const initMiningSession = require('../models/MiningSession');
    MiningSession = initMiningSession(sequelize, DataTypes);
  }

  // 2. Récupération des autres modèles déjà chargés par ailleurs
  const User = sequelize.models.User;
  const Portfolio = sequelize.models.Portfolio;

  return { MiningSession, User, Portfolio };
};

exports.startMining = async (req, res, next) => {
  const { MiningSession, User, Portfolio } = getModels();
  
  const t = await sequelize.transaction();
  try {
    const { machineId, machineName, machineImage, tierId, amount } = req.body;

    if (!machineId || !machineName || !tierId || !amount) {
      await t.rollback();
      return error(res, 'Données de la machine manquantes', 400);
    }

    const tier = MINING_TIERS[tierId];
    if (!tier) {
      await t.rollback();
      return error(res, 'Palier de minage invalide', 400);
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      await t.rollback();
      return error(res, 'Montant invalide', 400);
    }

    const user = await User.findByPk(req.user.id, { transaction: t });

    if (parseFloat(user.balance) < numericAmount) {
      await t.rollback();
      return error(res, 'Solde insuffisant', 400);
    }

    const profit = (numericAmount * tier.rate) / 100;
    const payout = numericAmount + profit;

    const startDate = new Date();
    const endDate = new Date(startDate);
    // ✅ PRODUCTION: vrais mois calendaires (gère automatiquement les mois de 28/30/31 jours)
    endDate.setMonth(endDate.getMonth() + tier.months);

    const session = await MiningSession.create({
      userId: req.user.id,
      machineId, machineName, machineImage,
      tierId: tier.id, tierLabel: tier.label, months: tier.months, rate: tier.rate,
      amount: numericAmount, payout, startDate, endDate, status: 'running',
    }, { transaction: t });

    await user.update({ balance: parseFloat(user.balance) - numericAmount }, { transaction: t });
    await Portfolio.increment({ totalInvested: numericAmount }, { where: { userId: req.user.id }, transaction: t });

    await t.commit();
    return success(res, session, 'Minage démarré', 201);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getMySessions = async (req, res, next) => {
  const { MiningSession } = getModels();
  
  try {
    const sessions = await MiningSession.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return success(res, sessions);
  } catch (err) {
    next(err);
  }
};

exports.distributeMiningPayouts = async () => {
  const { MiningSession, User, Portfolio } = getModels();
  
  const t = await sequelize.transaction();
  try {
    const now = new Date();
    const due = await MiningSession.findAll({
      where: { status: 'running', endDate: { [Op.lte]: now } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    console.log(`⛏️  ${due.length} session(s) de minage à payer`);

    for (const session of due) {
      const payout = parseFloat(session.payout || 0);
      const profit = payout - parseFloat(session.amount || 0);

      await User.increment({ balance: payout }, { where: { id: session.userId }, transaction: t });
      await Portfolio.increment({ profitLoss: profit }, { where: { userId: session.userId }, transaction: t });

      await session.update({ status: 'completed', paidAt: now }, { transaction: t });
      console.log(`✅ Minage payé: ${payout} FCFA → user ${session.userId}`);
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error('❌ Error distributeMiningPayouts:', err);
  }
};