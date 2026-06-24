const express         = require('express');
const router          = express.Router();
const adminCtrl       = require('../controllers/admin.controller');
const adminMiddleware = require('../middlewares/admin.middleware');

router.post('/auth/login', adminCtrl.login);

router.get('/transactions',       adminMiddleware, adminCtrl.getTransactions);
router.patch('/transactions/:id', adminMiddleware, adminCtrl.updateTransaction);

// ✅ GESTION UTILISATEURS
router.get('/users',                adminMiddleware, adminCtrl.getUsers);
router.patch('/users/:id/status',   adminMiddleware, adminCtrl.updateUserStatus);
router.delete('/users/:id',         adminMiddleware, adminCtrl.deleteUser);

module.exports = router;