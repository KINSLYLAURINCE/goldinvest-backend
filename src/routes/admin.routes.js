const express         = require('express');
const router          = express.Router();
const adminCtrl       = require('../controllers/admin.controller');
const adminMiddleware = require('../middlewares/admin.middleware');

router.post('/auth/login', adminCtrl.login);

router.get('/transactions',       adminMiddleware, adminCtrl.getTransactions);
router.patch('/transactions/:id', adminMiddleware, adminCtrl.updateTransaction); // ✅ corrigé

module.exports = router;