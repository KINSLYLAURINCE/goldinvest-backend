const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { User } = require('../models');
const { success, error } = require('../utils/apiResponse');

// ✅ GET /api/users/me — Récupérer le profil
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshToken'] }
    });
    return success(res, user);
  } catch (err) { next(err); }
});

// ✅ PUT /api/users/me — Mettre à jour le profil
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    if (!firstName) return error(res, 'Prénom requis', 400);

    const user = await User.findByPk(req.user.id);
    await user.update({ firstName, lastName, phone });

    const updated = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshToken'] }
    });

    return success(res, updated, 'Profil mis à jour.');
  } catch (err) { next(err); }
});

// ✅ PUT /api/users/me/password — Changer le mot de passe
router.put('/me/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return error(res, 'Champs requis', 400);

    if (newPassword.length < 6)
      return error(res, 'Minimum 6 caractères', 400);

    const user = await User.findByPk(req.user.id);

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid)
      return error(res, 'Mot de passe actuel incorrect', 401);

    // Hasher et sauvegarder le nouveau
    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashed });

    return success(res, null, 'Mot de passe mis à jour.');
  } catch (err) { next(err); }
});

module.exports = router;
