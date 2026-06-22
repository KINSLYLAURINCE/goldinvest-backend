const { Portfolio, Transaction, GoldPrice } = require('../models');
const { success, error } = require('../utils/apiResponse');

exports.getMyPortfolio = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { userId: req.user.id } });
    if (!portfolio) return error(res, 'Portfolio introuvable.', 404);

    // 👇 AJOUTEZ CES LIGNES
    console.log('📊 Portfolio brut DB:', {
      userId:         portfolio.userId,
      totalInvested:  portfolio.totalInvested,
      goldQuantityOz: portfolio.goldQuantityOz,
      currentValue:   portfolio.currentValue,
      profitLoss:     portfolio.profitLoss,
    });

    const latestPrice = await GoldPrice.findOne({ order: [['fetchedAt', 'DESC']] });
    if (latestPrice && portfolio.goldQuantityOz > 0) {
      const currentValue = parseFloat(portfolio.goldQuantityOz) * parseFloat(latestPrice.priceUSD);
      const profitLoss = currentValue - parseFloat(portfolio.totalInvested);
      await portfolio.update({ currentValue, profitLoss });
    }
    return success(res, portfolio, 'Portfolio récupéré.');
  } catch (err) { next(err); }
};
