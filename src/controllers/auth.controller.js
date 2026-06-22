const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Portfolio } = require('../models');
const jwtConfig = require('../config/jwt');
const { success, error } = require('../utils/apiResponse');

// ✅ Génère un code parrainage unique style "OG-XXXXXXXX"
const generateReferralCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code, exists;
  do {
    const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    code = `OG-${random}`;
    exists = await User.findOne({ where: { referralCode: code } });
  } while (exists);
  return code;
};

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken  = jwt.sign(payload, jwtConfig.secret,        { expiresIn: jwtConfig.expiresIn });
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });
  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, ref } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return error(res, 'Email déjà utilisé.', 409);

    // ✅ Vérifier si le code parrain existe
    let referredBy = null;
    if (ref) {
      const parrain = await User.findOne({ where: { referralCode: ref } });
      if (parrain) {
        referredBy = parrain.id;
      }
      // Si code invalide, on ignore silencieusement
    }

    const hashed       = await bcrypt.hash(password, 12);
    const referralCode = await generateReferralCode();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      referralCode,
      referredBy,
      hasDeposited: false,
    });

    await Portfolio.create({ userId: user.id });

    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refreshToken });

    return success(res, {
      accessToken,
      refreshToken,
      user: { id: user.id, email, firstName, lastName, referralCode },
    }, 'Compte créé.', 201);

  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return error(res, 'Email ou mot de passe incorrect.', 401);

    const { accessToken, refreshToken } = generateTokens(user);
    await user.update({ refreshToken });

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id:           user.id,
        email,
        firstName:    user.firstName,
        lastName:     user.lastName,
        role:         user.role,
        balance:      user.balance,
        referralCode: user.referralCode,
      },
    }, 'Connexion réussie.');
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    await User.update({ refreshToken: null }, { where: { id: req.user.id } });
    return success(res, null, 'Déconnexion réussie.');
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token requis.', 401);
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    const user = await User.findOne({ where: { id: decoded.id, refreshToken } });
    if (!user) return error(res, 'Token invalide.', 401);
    const tokens = generateTokens(user);
    await user.update({ refreshToken: tokens.refreshToken });
    return success(res, tokens, 'Token renouvelé.');
  } catch (err) { next(err); }
};