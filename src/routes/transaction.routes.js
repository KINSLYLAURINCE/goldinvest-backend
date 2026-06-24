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
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg'; // fallback si pas d'extension
    const name = `proof_${req.user?.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/heic',
      'image/heif',
      'application/octet-stream', // iPhone envoie parfois HEIC avec ce MIME
    ];

    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.heic', '.heif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté'), false);
    }
  },
});

router.get('/',         authMiddleware, ctrl.getMyTransactions);
router.post('/buy',     authMiddleware, ctrl.buyGold);
router.post('/deposit', authMiddleware, upload.single('proof'), ctrl.createDeposit);

module.exports = router;