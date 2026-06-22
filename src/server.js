require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connecté avec succès');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('✅ Modèles synchronisés');

    app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré sur le port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('❌ Erreur de démarrage :', error);
    process.exit(1);
  }
}

const startGainScheduler = require('./utils/gainScheduler');

// Dans startServer(), après sequelize.sync() :
startGainScheduler();

startServer();
