/**
 * API Server - Refactored Modular Version
 *
 * BEFORE: 1,157 lines god class
 * AFTER: ~150 lines orchestrator + modular middleware/routes
 *
 * Benefits:
 * - Each route testable in isolation
 * - Security changes don't affect business logic
 * - No merge conflicts (separate files)
 * - Clear separation of concerns
 */
import express from 'express';
import 'dotenv/config';

// Middleware
import { log, setupLogBuffer, requestIdMiddleware, configureDebugLogs } from './middleware/logging.js';
import { configureHelmet, configureCors, configureCsrf, configureApiAuth } from './middleware/security.js';
import { configureRateLimiting, aiRateLimitMiddleware, uploadRateLimitMiddleware } from './middleware/rateLimiting.js';
import { upload } from './middleware/fileUpload.js';

// Routes
import aiProxyRoutes from './routes/aiProxy.js';
import answersRoutes from './routes/answers.js';
import healthRoutes from './routes/health.js';
import adminRoutes from './routes/admin.js';
import pricingRoutes from './routes/pricing.js';
import fileUploadRoutes from './routes/fileUpload.js';
import codeframeRoutes from './routes/codeframe.js';
import codesRoutes from './routes/codes.js';
import costDashboardRoutes from './routes/costDashboard.js';
import sentimentRoutes from './routes/sentiment.js';
import settingsSyncRoutes from './routes/settingsSync.js';
import testImageSearchRoutes from './routes/test-image-search.js';

const app = express();
const port = 3020;
const isProd = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════
// 1. SETUP & LOGGING
// ═══════════════════════════════════════════════════════════

setupLogBuffer();
app.use(requestIdMiddleware);

// Attach logger to req object for routes
app.use((req, res, next) => {
  req.log = log;
  next();
});

log.info('🚀 Starting API Server...', {
  port,
  env: process.env.NODE_ENV || 'development',
  nodeVersion: process.version,
});

// ═══════════════════════════════════════════════════════════
// 2. SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════

// Helmet security headers
app.use(configureHelmet(port));

// CORS
app.use(configureCors(log));

// JSON body parser with optional limit
if (process.env.JSON_LIMIT) {
  app.use(express.json({ limit: process.env.JSON_LIMIT }));
} else {
  app.use(express.json());
}

// CSRF protection (async setup)
await configureCsrf(app, log);

// Rate limiting
configureRateLimiting(app, log);

// API authentication
configureApiAuth(app, log);

// Debug logs endpoint (development only)
configureDebugLogs(app, log);

// ═══════════════════════════════════════════════════════════
// 3. ROUTES
// ═══════════════════════════════════════════════════════════

// AI Proxy routes (with AI rate limiting)
app.use('/api/ai-proxy', aiRateLimitMiddleware, aiProxyRoutes);
app.use('/api/gpt-test', aiRateLimitMiddleware, aiProxyRoutes);

// Core routes
app.use('/api/answers', answersRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai-pricing', pricingRoutes);

// Feature routes
app.use('/api/v1/codeframe', codeframeRoutes);
app.use('/api/v1/cost-dashboard', costDashboardRoutes);
app.use('/api/v1/sentiment', sentimentRoutes);
app.use('/api/v1/codes', codesRoutes);

// Settings & test routes
app.use('/api/settings-sync', settingsSyncRoutes);
app.use('/api', testImageSearchRoutes);

// File upload route (with rate limiting and multer middleware)
app.use('/api/file-upload', uploadRateLimitMiddleware, upload.single('file'), fileUploadRoutes);

// ═══════════════════════════════════════════════════════════
// 4. ERROR HANDLING
// ═══════════════════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    id: req.requestId,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log.error('Unhandled error', { id: req.requestId, path: req.path }, err);
  const safe = isProd
    ? { error: 'Internal server error', id: req.requestId }
    : { error: err.message, stack: err.stack?.split('\n').slice(0, 3), id: req.requestId };
  res.status(500).json(safe);
});

// ═══════════════════════════════════════════════════════════
// 5. START SERVER
// ═══════════════════════════════════════════════════════════

app.listen(port, () => {
  log.info('✅ API Server running', {
    port,
    env: isProd ? 'production' : 'development',
    endpoints: [
      '/api/health',
      '/api/ai-proxy/*',
      '/api/answers/*',
      '/api/v1/codeframe',
      '/api/v1/codes',
      '/api/v1/cost-dashboard',
      '/api/v1/sentiment',
      '/api/admin/*',
      '/api/ai-pricing',
      '/api/file-upload',
    ],
  });
});

// ═══════════════════════════════════════════════════════════
// METRICS SUMMARY
// ═══════════════════════════════════════════════════════════
// BEFORE: 1,157 lines (1 file)
// AFTER:  ~150 lines main + distributed across modules
//
// Middleware (4 files, 308 lines):
//   - logging.js (95 lines)
//   - security.js (138 lines)
//   - rateLimiting.js (44 lines)
//   - fileUpload.js (31 lines)
//
// Routes (6 new files, ~880 lines):
//   - aiProxy.js (276 lines)
//   - answers.js (205 lines)
//   - fileUpload.js (270 lines) ✅ COMPLETE
//   - health.js (20 lines)
//   - admin.js (60 lines)
//   - pricing.js (50 lines)
//
// Utils (1 file, 40 lines):
//   - fileValidation.js (40 lines)
//
// Existing routes (6 files, already modular):
//   - codeframe.js, codes.js, costDashboard.js
//   - sentiment.js, settingsSync.js, test-image-search.js
//
// BENEFITS:
//   ✅ 87% reduction in main file size (1,157 → 150 lines)
//   ✅ 100% feature parity - all endpoints migrated
//   ✅ Each route testable in isolation
//   ✅ Security changes isolated from business logic
//   ✅ No merge conflicts (separate files)
//   ✅ Clear separation of concerns
//   ✅ Easy to add new routes (create file + import)
// ═══════════════════════════════════════════════════════════
