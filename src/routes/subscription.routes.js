const router = require('express').Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const { subscribe, getMySubscriptions } = require('../controllers/subscription.controller');

router.post('/',  authMiddleware, subscribe);
router.get('/me', authMiddleware, getMySubscriptions);

module.exports = router;