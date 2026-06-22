const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/transaction.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Dossier uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `proof_${req.user?.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté'), false);
  },
});

router.get('/',         authMiddleware, ctrl.getMyTransactions);
router.post('/buy',     authMiddleware, ctrl.buyGold);
router.post('/deposit', authMiddleware, upload.single('proof'), ctrl.createDeposit);

module.exports = router;