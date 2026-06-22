const router = require('express').Router();
const { getMyPortfolio } = require('../controllers/portfolio.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getMyPortfolio);

module.exports = router;
