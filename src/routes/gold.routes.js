const router = require('express').Router();
const { getCurrentPrice, getPriceHistory, requestWithdrawal } = require('../controllers/gold.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.get('/price',     authMiddleware, getCurrentPrice);
router.get('/history',   authMiddleware, getPriceHistory);
router.post('/withdraw', authMiddleware, requestWithdrawal);

module.exports = router;