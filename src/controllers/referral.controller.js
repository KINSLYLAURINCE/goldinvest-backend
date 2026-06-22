const { User, Commission } = require('../models');
const { Op } = require('sequelize');
const { success, error } = require('../utils/apiResponse');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://usgoldcorp.app';

exports.getMyReferralData = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return error(res, 'Utilisateur introuvable', 404);

    const niveau1 = await User.findAll({
      where: { referredBy: user.id },
      attributes: ['id', 'firstName', 'lastName', 'hasDeposited', 'createdAt'],
    });
    const niveau1Ids = niveau1.map(u => u.id);

    const niveau2 = niveau1Ids.length
      ? await User.findAll({
          where: { referredBy: { [Op.in]: niveau1Ids } },
          attributes: ['id', 'firstName', 'lastName', 'hasDeposited', 'createdAt'],
        })
      : [];
    const niveau2Ids = niveau2.map(u => u.id);

    const niveau3 = niveau2Ids.length
      ? await User.findAll({
          where: { referredBy: { [Op.in]: niveau2Ids } },
          attributes: ['id', 'firstName', 'lastName', 'hasDeposited', 'createdAt'],
        })
      : [];

    const commissions = await Commission.findAll({ where: { userId: user.id } });
    const gainParFilleul = {};
    commissions.forEach(c => {
      gainParFilleul[c.fromUserId] = (gainParFilleul[c.fromUserId] || 0) + parseFloat(c.amount);
    });

    const formatFilleul = (u, level) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      level,
      date: new Date(u.createdAt).toLocaleDateString('fr-FR'),
      status: u.hasDeposited ? 'actif' : 'en attente',
      gain: gainParFilleul[u.id] || 0,
    });

    const referrals = [
      ...niveau1.map(u => formatFilleul(u, 1)),
      ...niveau2.map(u => formatFilleul(u, 2)),
      ...niveau3.map(u => formatFilleul(u, 3)),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalGains = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    const monthGains = commissions
      .filter(c => new Date(c.createdAt) >= debutMois)
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    return success(res, {
      code: user.referralCode,
      link: `${FRONTEND_URL}/register?ref=${user.referralCode}`,
      referrals,
      totalGains,
      monthGains,
    });
  } catch (err) { next(err); }
};