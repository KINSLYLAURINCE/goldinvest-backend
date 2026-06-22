const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const goldRoutes         = require('./routes/gold.routes');
const portfolioRoutes    = require('./routes/portfolio.routes');
const transactionRoutes  = require('./routes/transaction.routes');
const referralRoutes     = require('./routes/referral.routes');
const adminRoutes        = require('./routes/admin.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const errorMiddleware    = require('./middlewares/error.middleware');

const app = express();

app.set('trust proxy', 1);

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 1000,                  // 1000 requêtes par minute par IP
  skip: () => process.env.NODE_ENV === 'development', // désactivé en dev
});

app.use('/api/', limiter);

// Parsing
app.use(express.json());
// Après app.use(express.json()) :
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/gold',          goldRoutes);
app.use('/api/portfolio',     portfolioRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/referrals',     referralRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// 👉 Route mining
app.use('/api/mining', require('./routes/mining.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use(errorMiddleware);

module.exports = app;