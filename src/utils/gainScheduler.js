const cron = require('node-cron');
const { distributeGains } = require('../controllers/subscription.controller');
const { distributeMiningPayouts } = require('../controllers/mining.controller');

let isProcessing = false;
let isProcessingMining = false;

const startGainScheduler = () => {
  // ✅ PRODUCTION: vérification toutes les 15 min suffit largement
  // pour des gains crédités toutes les 24h (pas besoin de */3 min)
  cron.schedule('*/15 * * * *', async () => {
    if (isProcessing) {
      console.log('⛔ Distribution déjà en cours, skip...');
      return;
    }

    try {
      isProcessing = true;
      console.log('⏰ Vérification des gains à distribuer...');
      await distributeGains();
    } catch (err) {
      console.error('❌ Erreur scheduler gains:', err);
    } finally {
      isProcessing = false;
    }
  });

  // ✅ PRODUCTION: vérification toutes les heures suffit
  // pour des paiements de minage à 1, 2 ou 3 mois
  cron.schedule('0 * * * *', async () => {
    if (isProcessingMining) {
      console.log('⛔ Distribution Mining déjà en cours, skip...');
      return;
    }

    try {
      isProcessingMining = true;
      console.log('⏰ Distribution des gains de Mining...');
      await distributeMiningPayouts();
    } catch (err) {
      console.error('❌ Erreur scheduler Mining:', err);
    } finally {
      isProcessingMining = false;
    }
  });

  console.log('✅ Schedulers de gains (classique & mining) démarrés');
};

module.exports = startGainScheduler;