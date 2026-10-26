const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authRoutes       = require('./routes/auth');
const issueRoutes      = require('./routes/issue');
const uploadRoutes     = require('./routes/upload');
const complaintsRoutes = require('./routes/complaints');
const superAdminRoutes = require('./routes/superAdmin');
const adminRoutes      = require('./routes/admin');
const fieldWorkerRoutes = require('./routes/fieldWorker');

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.set('trust proxy', 1);  // Trust first proxy (Render/Vercel load balancer)
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // In production you may want to restrict this
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser()); // Parse req.cookies — must come before routes

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/issues',     issueRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/super-admin',   superAdminRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/field-worker',  fieldWorkerRoutes);

// Health check — useful for Railway/Render deploy
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
});

// ─── Centralized Error Handler (MUST be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
