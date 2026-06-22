const router = require('express').Router();
const { register, login, logout, refreshToken } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   authMiddleware, logout);
router.post('/refresh',  refreshToken);

module.exports = router;
