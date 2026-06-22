const { Transaction, Portfolio, User, GoldPrice, Commission } = require('../models');
const sequelize = require('../config/database');
const { success, error } = require('../utils/apiResponse');
const path = require('path');
const fs   = require('fs');

exports.buyGold = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { amountUSD } = req.body;
    const user = await User.findByPk(req.user.id);
    if (parseFloat(user.balance) < amountUSD) return error(res, 'Solde insuffisant.', 400);

    const latestPrice = await GoldPrice.findOne({ order: [['fetchedAt', 'DESC']] });
    if (!latestPrice) return error(res, "Prix de l'or non disponible.", 503);

    const goldQty = amountUSD / parseFloat(latestPrice.priceUSD);

    const tx = await Transaction.create({
      userId: req.user.id, type: 'buy',
      goldQuantityOz: goldQty, pricePerOz: latestPrice.priceUSD,
      totalAmount: amountUSD, status: 'completed',
    }, { transaction: t });

    await user.update({ balance: parseFloat(user.balance) - amountUSD }, { transaction: t });
    const portfolio = await Portfolio.findOne({ where: { userId: req.user.id } });
    await portfolio.update({
      goldQuantityOz: parseFloat(portfolio.goldQuantityOz) + goldQty,
      totalInvested:  parseFloat(portfolio.totalInvested)  + amountUSD,
    }, { transaction: t });

    await t.commit();
    return success(res, tx, "Achat d'or effectué.", 201);
  } catch (err) { await t.rollback(); next(err); }
};

exports.getMyTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows } = await Transaction.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset,
    });
    return success(res, { transactions: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { next(err); }
};

exports.createDeposit = async (req, res, next) => {
  try {
    const { amount, method, currency } = req.body;

    if (!amount || Number(amount) < 5000)
      return error(res, 'Montant minimum : 5 000 XAF', 400);
    if (!method)
      return error(res, 'Méthode de paiement requise', 400);
    if (!req.file)
      return error(res, 'Preuve de paiement requise', 400);

    const proofUrl = `/uploads/${req.file.filename}`;

    const tx = await Transaction.create({
      userId:      req.user.id,
      type:        'deposit',
      totalAmount: Number(amount),
      currency:    currency || 'XAF',
      method,
      proofUrl,
      status:      'pending',
      notes:       `Dépôt ${method.toUpperCase()} — en attente de validation`,
    });

    return success(res, tx, 'Dépôt soumis. En attente de validation admin.', 201);
  } catch (err) { next(err); }
};

// ✅ Met à jour le Portfolio + distribue les commissions de parrainage au 1er dépôt validé
exports.validateDeposit = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const tx = await Transaction.findByPk(req.params.id, { transaction: t });
    if (!tx) return error(res, 'Transaction introuvable', 404);
    if (tx.status !== 'pending') return error(res, 'Transaction déjà traitée', 400);

    const { status } = req.body;
    if (!['completed', 'failed'].includes(status))
      return error(res, 'Statut invalide', 400);

    await tx.update({ status }, { transaction: t });

    if (status === 'completed') {
      const montantFCFA = parseFloat(tx.totalAmount);

      // 1. Mettre à jour le solde utilisateur
      const user = await User.findByPk(tx.userId, { transaction: t });
      await user.update({
        balance: parseFloat(user.balance) + montantFCFA,
      }, { transaction: t });

      // 2. Mettre à jour le Portfolio
      const latestPrice = await GoldPrice.findOne({
        order: [['fetchedAt', 'DESC']],
        transaction: t,
      });

      const TAUX_FCFA_USD = 600; // 1 USD = 600 FCFA — ajustez si nécessaire
      const montantUSD    = montantFCFA / TAUX_FCFA_USD;
      const goldOz        = latestPrice
        ? montantUSD / parseFloat(latestPrice.priceUSD)
        : 0;

      console.log(`💰 Dépôt validé: ${montantFCFA} FCFA → ${goldOz.toFixed(6)} oz`);

      await Portfolio.increment(
        { totalInvested: montantFCFA, goldQuantityOz: goldOz },
        { where: { userId: tx.userId }, transaction: t }
      );

      console.log(`✅ Portfolio mis à jour pour userId: ${tx.userId}`);

      // 3. ✅ PARRAINAGE — commissions versées uniquement sur le 1er dépôt
      if (!user.hasDeposited) {
        await distribuerCommissions(user, montantFCFA, tx.id, t);
        await user.update({ hasDeposited: true }, { transaction: t });
        console.log(`🎯 Commissions de parrainage distribuées pour userId: ${tx.userId}`);
      }
    }

    await t.commit();
    return success(res, tx, status === 'completed' ? 'Dépôt validé' : 'Dépôt rejeté');
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ✅ PARRAINAGE — remonte la chaîne (N1 → N2 → N3) et crédite chaque palier
const RATES = { 1: 0.15, 2: 0.05, 3: 0.01 };

async function distribuerCommissions(filleul, montantFCFA, transactionId, t) {
  let currentUserId = filleul.referredBy;
  let level = 1;

  while (currentUserId && level <= 3) {
    const parrain = await User.findByPk(currentUserId, { transaction: t });
    if (!parrain) break;

    const rate   = RATES[level];
    const amount = montantFCFA * rate;

    await Commission.create({
      userId:        parrain.id,
      fromUserId:    filleul.id,
      transactionId,
      level,
      rate:          rate * 100,
      amount,
    }, { transaction: t });

    await parrain.update({
      balance: parseFloat(parrain.balance) + amount,
    }, { transaction: t });

    currentUserId = parrain.referredBy;
    level++;
  }
}