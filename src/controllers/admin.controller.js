const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { Transaction, User, Portfolio, GoldPrice, Commission } = require('../models/index');
const sequelize = require('../config/database');

const signToken = id => jwt.sign(
  { id, role: 'admin' },
  process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

// ✅ PARRAINAGE — même logique que transaction.controller.js (source de vérité unique)
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

    await User.increment(
      { balance: amount },
      { where: { id: parrain.id }, transaction: t }
    );

    console.log(`💸 Commission N${level} (${rate * 100}%) +${amount} FCFA → userId: ${parrain.id}`);

    currentUserId = parrain.referredBy;
    level++;
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔑 Tentative login:', email);

    const admin = await Admin.findOne({ where: { email } });
    console.log('👤 Admin trouvé:', admin ? 'OUI' : 'NON');

    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ message: 'Identifiants invalides' });

    await admin.update({ lastLogin: new Date() });
    res.json({ token: signToken(admin.id), admin: { email: admin.email, role: admin.role } });
  } catch (e) {
    console.error('❌ Erreur login:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type)   where.type   = type;

    const txs = await Transaction.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: txs });
  } catch (e) {
    console.error('❌ Erreur getTransactions:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    if (!['completed', 'failed', 'cancelled'].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
      transaction: t,
    });

    if (!tx) {
      await t.rollback();
      return res.status(404).json({ message: 'Transaction introuvable' });
    }

    // ✅ Empêcher double traitement
    if (tx.status === 'completed') {
      await t.rollback();
      return res.status(400).json({ message: 'Transaction déjà validée' });
    }
    if (tx.status === 'failed' || tx.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ message: 'Transaction déjà traitée (rejetée)' });
    }

    await tx.update({ status }, { transaction: t });

    console.log('🔍 DEBUG tx.type:', JSON.stringify(tx.type), '| status reçu:', JSON.stringify(status), '| tx.totalAmount:', tx.totalAmount);

    const TAUX_FCFA_USD = 600; // 1 USD = 600 FCFA — ajustez selon votre taux

    // ══════════════════════════════════════════════
    // ✅ DÉPÔT VALIDÉ
    // ══════════════════════════════════════════════
    if (status === 'completed' && tx.type === 'deposit') {
      const montantFCFA = parseFloat(tx.totalAmount || tx.amount || 0);

      // 1. Créditer le solde utilisateur
      await User.increment(
        { balance: montantFCFA },
        { where: { id: tx.userId }, transaction: t }
      );
      console.log(`💰 Solde crédité: +${montantFCFA} FCFA → userId: ${tx.userId}`);

      // 2. Mettre à jour le Portfolio
      const latestPrice = await GoldPrice.findOne({
        order: [['fetchedAt', 'DESC']],
        transaction: t,
      });
      const montantUSD = montantFCFA / TAUX_FCFA_USD;
      const goldOz = latestPrice
        ? montantUSD / parseFloat(latestPrice.priceUSD)
        : 0;

      console.log(`💰 Dépôt validé: ${montantFCFA} FCFA → ${goldOz.toFixed(6)} oz`);

      await Portfolio.increment(
        { totalInvested: montantFCFA, goldQuantityOz: goldOz },
        { where: { userId: tx.userId }, transaction: t }
      );
      console.log(`✅ Portfolio mis à jour pour userId: ${tx.userId}`);

      // ══════════════════════════════════════════════
      // ✅ COMMISSIONS PARRAINAGE (uniquement 1er dépôt)
      // via le modèle Commission — même logique que transaction.controller.js
      // ══════════════════════════════════════════════
      const filleul = await User.findByPk(tx.userId, { transaction: t });

      if (filleul && !filleul.hasDeposited && filleul.referredBy) {
        console.log(`🎯 Premier dépôt détecté pour userId: ${tx.userId} — calcul des commissions`);
        await distribuerCommissions(filleul, montantFCFA, tx.id, t);
        await filleul.update({ hasDeposited: true }, { transaction: t });
        console.log(`✅ hasDeposited = true pour userId: ${tx.userId}`);
      } else {
        console.log(`ℹ️ Pas de commission: hasDeposited=${filleul?.hasDeposited}, referredBy=${filleul?.referredBy}`);
      }
    }

    // ══════════════════════════════════════════════
    // ✅ RETRAIT REJETÉ → remboursement automatique
    // ══════════════════════════════════════════════
    if ((status === 'failed' || status === 'cancelled') && tx.type === 'withdrawal') {
      const montantARembourser = parseFloat(tx.totalAmount || tx.amount || 0);

      console.log('↩️ REMBOURSEMENT DÉCLENCHÉ:', montantARembourser, '→ userId:', tx.userId);

      if (montantARembourser <= 0) {
        await t.rollback();
        return res.status(500).json({ message: 'Erreur: montant du retrait introuvable' });
      }

      await User.increment(
        { balance: montantARembourser },
        { where: { id: tx.userId }, transaction: t }
      );
      console.log(`✅ +${montantARembourser} FCFA remboursés à userId: ${tx.userId}`);
    }

    // ✅ RETRAIT VALIDÉ → confirmation seulement (solde déjà débité)
    if (status === 'completed' && tx.type === 'withdrawal') {
      console.log(`✅ Retrait validé pour userId: ${tx.userId} — fonds envoyés via ${tx.operator} · +237 ${tx.phoneNumber}`);
    }

    // ✅ DÉPÔT REJETÉ → rien (jamais crédité)
    if ((status === 'failed' || status === 'cancelled') && tx.type === 'deposit') {
      console.log(`❌ Dépôt rejeté pour userId: ${tx.userId} — aucune action sur le solde`);
    }

    await t.commit();

    const updated = await Transaction.findByPk(tx.id, {
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
    });

    res.json({ data: updated, message: 'Transaction mise à jour avec succès' });

  } catch (e) {
    await t.rollback();
    console.error('❌ Erreur updateTransaction:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};