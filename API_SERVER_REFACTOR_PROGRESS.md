# API Server Refactoring - In Progress

**Status:** 40% Complete
**Started:** 2025-11-19
**Original File:** `api-server.js` (1,157 lines)
**Target:** Modular structure (~100 lines main + separate modules)

---

## ✅ COMPLETED (40%)

### Middleware Extracted

**Created Files:**

1. **`middleware/logging.js`** (95 lines)
   - Structured JSON logger
   - Request ID middleware
   - Ring buffer for debug logs
   - Debug logs endpoint

2. **`middleware/security.js`** (138 lines)
   - Helmet configuration
   - CORS configuration
   - CSRF protection
   - API authentication

3. **`middleware/rateLimiting.js`** (44 lines)
   - Global rate limiter (100-300 req/min)
   - Upload rate limiter (20 req/5min)
   - AI rate limiter (10 req/min)

4. **`middleware/fileUpload.js`** (31 lines)
   - Multer configuration
   - File type validation
   - 10MB size limit

### Routes Extracted

**Created Files:**

5. **`routes/aiProxy.js`** (276 lines)
   - Claude API proxy
   - Gemini API proxy
   - OpenAI GPT test endpoint

**Existing Files (already modular):**
- `routes/codeframe.js` ✅
- `routes/codes.js` ✅
- `routes/costDashboard.js` ✅
- `routes/sentiment.js` ✅
- `routes/settingsSync.js` ✅
- `routes/test-image-search.js` ✅

---

## ⏳ TODO (60%)

### Routes to Extract

**Still in api-server.js:**

1. **Answers Filter** (`/api/answers/filter`)
   - Complex Zod validation
   - Supabase queries
   - ~175 lines
   - → Create `routes/answers.js`

2. **File Upload** (`/api/file-upload`)
   - CSV/Excel parsing
   - Data validation
   - ~270 lines
   - → Create `routes/fileUpload.js`

3. **Health Check** (`/api/health`)
   - Simple endpoint
   - ~20 lines
   - → Create `routes/health.js`

4. **Admin Routes** (`/api/admin/*`)
   - Python/Node restart endpoints
   - ~60 lines
   - → Create `routes/admin.js`

5. **AI Pricing** (`/api/ai-pricing`)
   - Pricing fetch/refresh
   - ~50 lines
   - → Create `routes/pricing.js`

### Main Server File

**Create `api-server-refactored.js`:**
- Import all middleware
- Import all routes
- Configure app
- Start server
- Target: ~100-150 lines

---

## 📊 Progress Metrics

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| **Total Lines** | 1,157 | ~680 | 40% done |
| **Main File** | 1,157 | ~120 (target) | Pending |
| **Middleware** | Inline | 308 lines (4 files) | ✅ Done |
| **Routes** | Mixed | 276 lines (1 new) | In Progress |
| **Existing Routes** | 6 files | 6 files | ✅ Already good |

---

## 🎯 Next Steps

### Immediate (1-2 hours)

1. **Extract Answers Routes**
   ```javascript
   // routes/answers.js
   import express from 'express';
   import { createClient } from '@supabase/supabase-js';
   import { z } from 'zod';

   const router = express.Router();
   // ... filter logic
   export default router;
   ```

2. **Extract File Upload Routes**
   ```javascript
   // routes/fileUpload.js
   import express from 'express';
   import Papa from 'papaparse';
   import ExcelJS from 'exceljs';

   const router = express.Router();
   // ... upload logic
   export default router;
   ```

3. **Extract Health/Admin/Pricing Routes**
   - Small, simple endpoints
   - Quick wins

### Final Integration (30 min)

4. **Create Refactored Main File**
   ```javascript
   // api-server-refactored.js
   import express from 'express';
   import { log, requestIdMiddleware, setupLogBuffer } from './middleware/logging.js';
   import { configureHelmet, configureCors, configureCsrf } from './middleware/security.js';
   import { configureRateLimiting, aiRateLimitMiddleware, uploadRateLimitMiddleware } from './middleware/rateLimiting.js';

   import aiProxyRoutes from './routes/aiProxy.js';
   import answersRoutes from './routes/answers.js';
   import fileUploadRoutes from './routes/fileUpload.js';
   import healthRoutes from './routes/health.js';
   import adminRoutes from './routes/admin.js';
   import pricingRoutes from './routes/pricing.js';
   // ... existing routes

   const app = express();

   // Setup
   setupLogBuffer();
   app.use(requestIdMiddleware);
   app.use(express.json());

   // Security
   app.use(configureHelmet(3020));
   app.use(configureCors(log));
   await configureCsrf(app, log);
   configureRateLimiting(app, log);

   // Routes
   app.use('/api/ai-proxy', aiRateLimitMiddleware, aiProxyRoutes);
   app.use('/api/answers', answersRoutes);
   app.use('/api/upload', uploadRateLimitMiddleware, fileUploadRoutes);
   app.use('/api/health', healthRoutes);
   app.use('/api/admin', adminRoutes);
   app.use('/api/ai-pricing', pricingRoutes);
   // ... existing routes

   app.listen(3020, () => log.info('Server started', { port: 3020 }));
   ```

5. **Test & Replace**
   - Backup original: `mv api-server.js api-server.js.backup`
   - Rename: `mv api-server-refactored.js api-server.js`
   - Test: `npm run dev`

---

## 🚀 Expected Benefits

### After Completion:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Main File** | 1,157 lines | ~120 lines | 90% reduction |
| **Largest Route** | Mixed in main | ~270 lines | Isolated |
| **Testability** | Hard | Easy | Each route independent |
| **Maintainability** | Low | High | Clear separation |
| **Onboarding Time** | 4+ hours | 1 hour | 75% faster |

### Benefits:

✅ **Easier Testing** - Each route testable in isolation
✅ **No Merge Conflicts** - Developers work on separate files
✅ **Clear Ownership** - Each route has clear responsibility
✅ **Easy to Add Routes** - Just create new file + import
✅ **Security Isolation** - Security changes don't affect business logic

---

## 📝 Files Created So Far

```
coding-ui/
├── middleware/
│   ├── logging.js          ✅ 95 lines
│   ├── security.js         ✅ 138 lines
│   ├── rateLimiting.js     ✅ 44 lines
│   └── fileUpload.js       ✅ 31 lines
│
├── routes/
│   ├── aiProxy.js          ✅ 276 lines (NEW)
│   ├── codeframe.js        ✅ Already exists
│   ├── codes.js            ✅ Already exists
│   ├── costDashboard.js    ✅ Already exists
│   ├── sentiment.js        ✅ Already exists
│   ├── settingsSync.js     ✅ Already exists
│   ├── test-image-search.js ✅ Already exists
│   │
│   ├── answers.js          ⏳ TODO (175 lines)
│   ├── fileUpload.js       ⏳ TODO (270 lines)
│   ├── health.js           ⏳ TODO (20 lines)
│   ├── admin.js            ⏳ TODO (60 lines)
│   └── pricing.js          ⏳ TODO (50 lines)
│
└── api-server.js           ⏳ TODO (refactor to ~120 lines)
```

---

## ⏱️ Time Estimate

- **Completed:** ~2 hours
- **Remaining:** ~2-3 hours
  - Extract 5 route files: 1.5 hours
  - Create refactored main: 30 min
  - Testing: 30-60 min

**Total:** ~4-5 hours for complete refactoring

---

**Status:** Middleware extraction complete ✅
**Next:** Extract remaining route files (2-3 hours)
**Ready to continue?**
