const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    console.log('🔑 Auth header reçu:', header);
    console.log('🍪 All headers:', req.headers);
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ message: 'Non autorisé' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);

    if (decoded.role !== 'admin')
      return res.status(403).json({ message: 'Accès refusé' });

    const admin = await Admin.findByPk(decoded.id);
    if (!admin) return res.status(401).json({ message: 'Admin introuvable' });

    req.admin = admin;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};
