const express = require('express');
const router = express.Router();

// Extraction dynamique pour éviter les dépendances circulaires
const getAuth = (req, res, next) => require('../middlewares/auth.middleware').authMiddleware(req, res, next);
const getController = () => require('../controllers/mining.controller');

// Configuration des routes avec le bon middleware d'authentification
router.post('/start', getAuth, (req, res, next) => getController().startMining(req, res, next));
router.get('/my-sessions', getAuth, (req, res, next) => getController().getMySessions(req, res, next));

module.exports = router;
