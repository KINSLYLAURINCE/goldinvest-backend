const { Subscription, User, Portfolio } = require('../models');
const sequelize = require('../config/database');
const { success, error } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// ✅ PRODUCTION: gain crédité toutes les 24h à partir de la date de souscription
const GAIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

// =========================
// 🟢 SOUSCRIPTION
// =========================
exports.subscribe = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { planId, planName, amount, dailyRate, durationDays } = req.body;

    if (!planId || !amount || !dailyRate || !durationDays) {
      await t.rollback();
      return error(res, 'Données du plan manquantes', 400);
    }

    const user = await User.findByPk(req.user.id, { transaction: t });

    if (parseFloat(user.balance) < parseFloat(amount)) {
      await t.rollback();
      return error(res, 'Solde insuffisant pour souscrire à ce plan', 400);
    }

    const dailyGain = (parseFloat(amount) * parseFloat(dailyRate)) / 100;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    // ✅ PRODUCTION: premier gain 24h après la souscription
    // Ancré sur startDate de CETTE souscription (et non sur Date.now() global)
    // pour que chaque souscription garde son propre rythme indépendant.
    const nextGainDate = new Date(startDate);
    nextGainDate.setTime(nextGainDate.getTime() + GAIN_INTERVAL_MS);

    const subscription = await Subscription.create({
      userId: req.user.id,
      planId,
      planName,
      amount,
      dailyRate,
      dailyGain,
      durationDays,
      startDate,
      endDate,
      nextGainDate,
      totalGainPaid: 0,
      daysCompleted: 0,
      status: 'active',
    }, { transaction: t });

    await user.update({
      balance: parseFloat(user.balance) - parseFloat(amount),
    }, { transaction: t });

    await Portfolio.increment(
      { totalInvested: parseFloat(amount) },
      { where: { userId: req.user.id }, transaction: t }
    );

    console.log(`✅ Souscription créée: ${planName} — ${amount} FCFA débités`);

    await t.commit();

    return success(res, subscription, 'Souscription effectuée avec succès.', 201);

  } catch (err) {
    await t.rollback();
    next(err);
  }
};


// =========================
// 🟢 MES SOUSCRIPTIONS
// =========================
exports.getMySubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    return success(res, subscriptions);
  } catch (err) {
    next(err);
  }
};


// =========================
// 🔥 DISTRIBUTION GAINS (CRON)
// =========================
exports.distributeGains = async () => {
  const t = await sequelize.transaction();

  try {
    const now = new Date();

    const due = await Subscription.findAll({
      where: {
        status: 'active',
        nextGainDate: { [Op.lte]: now },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    console.log(`💰 ${due.length} souscription(s) à payer`);

    for (const sub of due) {

      const gain = parseFloat(sub.dailyGain || 0);

      if (!sub.nextGainDate) continue;

      // 🔥 USER BALANCE — where: { id: ... } car `id` est la clé primaire de User
      await User.increment(
        { balance: gain },
        {
          where: { id: sub.userId },
          transaction: t,
        }
      );

      // 🔥 PORTFOLIO
      await Portfolio.increment(
        { profitLoss: gain },
        {
          where: { userId: sub.userId },
          transaction: t,
        }
      );

      const daysCompleted = (sub.daysCompleted || 0) + 1;
      const totalGainPaid = parseFloat(sub.totalGainPaid || 0) + gain;

      const isCompleted = daysCompleted >= sub.durationDays;

      // ✅ PRODUCTION: prochain gain 24h après le précédent
      // Ancré sur le nextGainDate PRÉCÉDENT de CETTE souscription (pas sur Date.now()
      // ni sur l'heure de passage du cron) afin que chaque souscription conserve
      // son propre rythme indépendant, sans dérive ni resynchronisation avec les autres.
      let nextGainDate = null;
      if (!isCompleted) {
        nextGainDate = new Date(sub.nextGainDate);
        nextGainDate.setTime(nextGainDate.getTime() + GAIN_INTERVAL_MS);
      }

      await sub.update({
        daysCompleted,
        totalGainPaid,
        nextGainDate,
        status: isCompleted ? 'completed' : 'active',
      }, { transaction: t });

      console.log(`✅ Gain distribué: ${gain} FCFA → userId ${sub.userId} (jour ${daysCompleted}/${sub.durationDays})`);
    }

    await t.commit();
    console.log('✅ Distribution des gains terminée');

  } catch (err) {
    await t.rollback();
    console.error('❌ Erreur distribution gains:', err);
  }
};