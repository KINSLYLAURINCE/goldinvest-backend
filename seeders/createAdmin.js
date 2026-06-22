require('dotenv').config();
const bcrypt    = require('bcryptjs');
const sequelize = require('../src/config/database');
const Admin = require('../src/models/Admin');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');

    await Admin.sync({ alter: true });

    const exists = await Admin.findOne({ where: { email: 'admin@goldinvest.app' } });
    if (exists) { console.log('⚠️  Admin déjà existant'); process.exit(); }

    const password = await bcrypt.hash('GoldAdmin2024!', 12);
    await Admin.create({
      email:    'admin@goldinvest.app',
      password,
      role:     'admin',
    });

    console.log('✅ Admin créé avec succès');
    console.log('📧 Email    : admin@goldinvest.app');
    console.log('🔑 Password : GoldAdmin2024!');
    process.exit();
  } catch (e) {
    console.error('❌ Erreur :', e.message);
    process.exit(1);
  }
})();