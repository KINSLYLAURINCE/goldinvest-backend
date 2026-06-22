const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware'); // ✅ corrigé
const referralController = require('../controllers/referral.controller');

router.get('/me', authMiddleware, referralController.getMyReferralData);

module.exports = router;