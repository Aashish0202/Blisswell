const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const memberRoutes = require('./routes/memberRoutes');
const Settings = require('./models/Settings');
const OfferBanner = require('./models/OfferBanner');
const Order = require('./models/Order');
const PaymentRequest = require('./models/PaymentRequest');
const RewardPlan = require('./models/RewardPlan');

// Import cron
const { initExpireProcessingOrdersCron } = require('./cron/expireProcessingOrders');
const { initRewardReconciliationCron } = require('./cron/rewardReconciliation');

// Auto-migration (runs pending schema migrations before the server starts)
const { runMigrationsIfStale } = require('./services/autoMigration');

const app = express();

// Behind the production reverse proxy (nginx) req.ip would otherwise be the
// proxy's IP for every visitor — without this the rate limiter would count
// ALL users against one shared bucket and 429 the whole site under load.
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { message: 'Too many requests, please try again later.' }
});

// Middleware
// CORS configuration - allow multiple origins for development and production
const allowedOrigins = [
  'https://blisswell.in',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL // Production URL from .env
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development (dev servers can land on 3002+, 5001+)
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Keep the raw body so the Razorpay webhook can verify its HMAC signature
// against the exact bytes Razorpay signed (re-stringified JSON can differ).
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/orders/razorpay-webhook')) req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// CRITICAL: Disable caching for ALL API routes to prevent stale user data
// This ensures each user sees their own data, not cached data from previous users
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Serve static files from uploads directory with CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
}));
// Apply rate limiting to API routes
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/member', memberRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Public site settings (for logo, site name, etc.)
app.get('/api/settings/site', async (req, res) => {
  try {
    const settings = await Settings.getSiteSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get site settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Image proxy endpoint - returns image as base64 (bypasses CORS)
app.get('/api/image-base64', (req, res) => {
  try {
    const imagePath = req.query.path;
    console.log('Image proxy request:', imagePath);

    if (!imagePath) {
      return res.status(400).json({ error: 'Image path required' });
    }

    // Security: only allow paths starting with /uploads/
    if (!imagePath.startsWith('/uploads/')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Normalize path for Windows (remove leading slash and convert forward slashes)
    const normalizedPath = imagePath.replace(/^\//, '').replace(/\//g, path.sep);
    const fullPath = path.join(__dirname, normalizedPath);
    console.log('Full path:', fullPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('File not found at:', fullPath);
      return res.status(404).json({ error: 'Image not found' });
    }

    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    res.json({ dataUrl });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

// Run pending DB migrations first — refuse to serve requests against an
// outdated schema (income/withdrawal routes would throw SQL errors).
(async () => {
  try {
    await runMigrationsIfStale();
    await OfferBanner.ensureTable();
    await Order.ensureDesignSnapshot();
    await PaymentRequest.ensureSchema();
    await RewardPlan.ensureSchema();
  } catch (err) {
    console.error('❌ Startup migration failed — server not started. Fix the database and reboot.');
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Initialize cron jobs (daily-incentive cron retired with the salary model;
    // auto-repurchase sweep retired with the repurchase wallet)
    initExpireProcessingOrdersCron();
    initRewardReconciliationCron();
  });
})();

module.exports = app;