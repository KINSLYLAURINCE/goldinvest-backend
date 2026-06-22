const axios = require('axios');
const { GoldPrice, User, Transaction, Subscription } = require('../models');
const sequelize = require('../config/database');
const { success, error } = require('../utils/apiResponse');

exports.getCurrentPrice = async (req, res, next) => {
  try {
    const mockPrice = {
      priceUSD: 2385.50,
      openPrice: 2370.00,
      highPrice: 2395.00,
      lowPrice: 2365.00,
      change: 15.50,
      changePct: 0.65,
    };
    const saved = await GoldPrice.create({ ...mockPrice, fetchedAt: new Date() });
    return success(res, saved, 'Prix de l\'or récupéré.');
  } catch (err) { next(err); }
};

exports.getPriceHistory = async (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    const prices = await GoldPrice.findAll({
      order: [['fetchedAt', 'DESC']],
      limit: parseInt(limit),
    });
    return success(res, prices, 'Historique des prix.');
  } catch (err) { next(err); }
};

exports.requestWithdrawal = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { amount, operator, phoneNumber, accountName } = req.body;
    const userId = req.user?.id;

    // 1. Validation des champs
    if (!amount || !operator || !phoneNumber || !accountName) {
      await t.rollback();
      return error(res, "Tous les champs sont obligatoires.", 400);
    }

    // 2. Validation nom — lettres uniquement
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
    if (!nameRegex.test(accountName.trim())) {
      await t.rollback();
      return error(res, "Le nom du titulaire ne doit contenir que des lettres.", 400);
    }

    // 3. Validation numéro — 9 chiffres
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber.toString().trim())) {
      await t.rollback();
      return error(res, "Le numéro doit contenir exactement 9 chiffres.", 400);
    }

    // 4. Minimum 1000 FCFA
    if (Number(amount) < 1000) {
      await t.rollback();
      return error(res, "Le montant minimum de retrait est 1 000 FCFA.", 400);
    }

    // 5. Vérifier utilisateur
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return error(res, "Utilisateur introuvable.", 404);
    }

    // 5.5 ✅ Vérifier qu'il a un plan d'investissement actif
    const activePlan = await Subscription.findOne({
      where: { userId, status: 'active' },
      transaction: t,
    });
    if (!activePlan) {
      await t.rollback();
      return error(res, "Vous devez avoir un plan d'investissement actif pour effectuer un retrait.", 403);
    }

    // 6. Vérifier solde
    if (parseFloat(user.balance) < Number(amount)) {
      await t.rollback();
      return error(res, "Solde insuffisant.", 400);
    }

    // 7. Calcul des frais 15% sur le montant demandé
    const FEE_RATE       = 0.15;
    const totalAmount    = Number(amount);
    const fees           = totalAmount * FEE_RATE;
    const amountReceived = totalAmount - fees;

    // 8. Débiter le solde immédiatement (montant brut, opération atomique)
    await User.decrement(
      { balance: totalAmount },
      { where: { id: userId }, transaction: t }
    );

    // 9. Créer la transaction en attente de validation admin
    const withdrawal = await Transaction.create({
      userId,
      type:           'withdrawal',
      totalAmount,
      amount:         totalAmount,
      fees,
      amountReceived,
      operator,
      phoneNumber:    phoneNumber.toString().trim(),
      accountName:    accountName.trim(),
      status:         'pending',
      currency:       'XAF',
      notes: `Retrait ${operator} · +237 ${phoneNumber} · ${accountName.trim()} · en attente de validation`,
    }, { transaction: t });

    await t.commit();
    return success(res, withdrawal, "Demande de retrait soumise. En attente de validation par l'administrateur.", 201);

  } catch (err) {
    await t.rollback();
    console.error('❌ Erreur requestWithdrawal:', err);
    next(err);
  }
};