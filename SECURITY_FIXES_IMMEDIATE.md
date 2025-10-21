# 🚨 SECURITY FIXES - IMMEDIATE ACTION REQUIRED

**Priority:** CRITICAL
**Estimated Time:** 4-6 hours
**Must Complete Before:** Production deployment

---

## ⚡ Quick Start (Copy-Paste Ready)

### Step 1: Update Dependencies (5 minutes)

```bash
# Fix critical CVEs
npm install xlsx@latest
npm install happy-dom@latest --save-dev

# Verify fixes
npm audit

# Expected: 0 critical, 0 high vulnerabilities
```

---

### Step 2: Fix RLS Policies (30 minutes)

**Location:** Supabase SQL Editor

```sql
-- ═══════════════════════════════════════════════════════════
-- 🔒 SECURE RLS POLICIES - Replace ALL existing policies
-- ═══════════════════════════════════════════════════════════

-- Step 1: Add user_id column to all tables
ALTER TABLE codes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE answers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Set existing data to a default user (or delete for fresh start)
-- UPDATE codes SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- UPDATE categories SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- UPDATE answers SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL (after data migration)
-- ALTER TABLE codes ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE answers ALTER COLUMN user_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 🛡️ CODES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "codes read" ON codes;
DROP POLICY IF EXISTS "codes write" ON codes;

-- ✅ Read: Only authenticated users can see their own codes
CREATE POLICY "codes_select_own" ON codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ✅ Insert: Users can only create codes for themselves
CREATE POLICY "codes_insert_own" ON codes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ✅ Update: Users can only update their own codes
CREATE POLICY "codes_update_own" ON codes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ✅ Delete: Users can only delete their own codes
CREATE POLICY "codes_delete_own" ON codes
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🛡️ CATEGORIES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories read" ON categories;
DROP POLICY IF EXISTS "categories write" ON categories;

CREATE POLICY "categories_select_own" ON categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🛡️ ANSWERS TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "answers UPDATE (anon ok)" ON answers;
DROP POLICY IF EXISTS "answers read" ON answers;
DROP POLICY IF EXISTS "answers write" ON answers;

CREATE POLICY "answers_select_own" ON answers
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_insert_own" ON answers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_update_own" ON answers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_delete_own" ON answers
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🛡️ CODES_CATEGORIES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "codes_categories read" ON codes_categories;
DROP POLICY IF EXISTS "codes_categories write" ON codes_categories;

-- ✅ Users can only see relations for their own codes/categories
CREATE POLICY "codes_categories_select_own" ON codes_categories
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

CREATE POLICY "codes_categories_insert_own" ON codes_categories
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
  );

CREATE POLICY "codes_categories_delete_own" ON codes_categories
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════
-- ✅ VERIFICATION
-- ═══════════════════════════════════════════════════════════

-- Test 1: Anonymous users should NOT see any data
SELECT count(*) FROM codes; -- Should return 0 or error

-- Test 2: Authenticated users should only see their data
-- (Run this after logging in)
SELECT count(*) FROM codes WHERE user_id = auth.uid(); -- Should work

-- Test 3: Try to insert as another user (should FAIL)
-- INSERT INTO codes (name, user_id) VALUES ('Test', 'some-other-uuid');
-- Expected: Error - RLS policy violation
```

---

### Step 3: Enable Security in .env (2 minutes)

**Location:** `.env` file (create if doesn't exist)

```bash
# ═══════════════════════════════════════════════════════════
# 🔒 SECURITY CONFIGURATION
# ═══════════════════════════════════════════════════════════

# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# OpenAI (Server-side ONLY - do NOT expose to client)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Offline Storage Encryption (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VITE_OFFLINE_KEY=YOUR_64_CHARACTER_HEX_KEY_HERE

# ─────────────────────────────────────────────────────────────
# 🛡️ API SECURITY (ENABLE ALL)
# ─────────────────────────────────────────────────────────────
ENABLE_API_AUTH=true
ENABLE_CSRF=true
ENABLE_RATE_LIMIT=true
ENABLE_CSP=true

# CORS (Comma-separated list of allowed origins)
CORS_ORIGINS=https://your-app.com,https://www.your-app.com

# API Access Token (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_ACCESS_TOKEN=YOUR_RANDOM_TOKEN_HERE

# Environment
NODE_ENV=production

# ─────────────────────────────────────────────────────────────
# 📊 MONITORING (Optional but recommended)
# ─────────────────────────────────────────────────────────────
VITE_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
```

---

### Step 4: Fix API Server Security (1 hour)

**Location:** `api-server.js`

#### 4.1: Force Authentication in Production

**Find lines 141-153:**
```javascript
// ❌ OLD (insecure)
if (process.env.ENABLE_API_AUTH === 'true') {
  app.use('/api', authenticate);
}
```

**Replace with:**
```javascript
// ✅ NEW (secure)
// Always require authentication in production
if (isProd) {
  app.use('/api', authenticate);
  console.log('✅ API authentication REQUIRED (production mode)');
} else if (process.env.ENABLE_API_AUTH !== 'false') {
  // In development, auth is optional but enabled by default
  app.use('/api', authenticate);
  console.log('⚠️ API authentication enabled (development mode)');
}
```

---

#### 4.2: Force CSRF Protection

**Find lines 122-130:**
```javascript
// ❌ OLD
if (process.env.ENABLE_CSRF === 'true') {
  app.use(cookieParser());
  // ...
}
```

**Replace with:**
```javascript
// ✅ NEW
// Always enable CSRF in production
if (isProd || process.env.ENABLE_CSRF !== 'false') {
  app.use(cookieParser());

  try {
    const csurf = (await import('csurf')).default;
    app.use(csurf({
      cookie: {
        httpOnly: true,
        sameSite: isProd ? 'strict' : 'lax',
        secure: isProd
      }
    }));
    console.log('✅ CSRF protection enabled');
  } catch (e) {
    if (isProd) {
      console.error('❌ CSRF protection FAILED - cannot start server');
      process.exit(1);
    }
    console.warn('⚠️ CSRF enabled but csurf not installed');
  }
}
```

---

#### 4.3: Force Rate Limiting

**Find lines 132-138:**
```javascript
// ❌ OLD
if (process.env.ENABLE_RATE_LIMIT === 'true') {
  const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
  app.use(globalLimiter);
}
```

**Replace with:**
```javascript
// ✅ NEW - Always enabled
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 100 : 300, // Stricter in production
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});
app.use(globalLimiter);
console.log(`✅ Rate limiting enabled: ${isProd ? 100 : 300} req/min`);

// Stricter limits for expensive AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Only 10 AI requests per minute
  message: 'AI rate limit exceeded. Please wait before trying again.'
});

// Apply to AI endpoints
app.post('/api/gpt-test', aiRateLimiter, async (req, res) => { /* ... */ });
```

---

#### 4.4: Disable Debug Logs in Production

**Find lines 156-161:**
```javascript
// ❌ OLD
if (!isProd || process.env.ENABLE_DEBUG_LOGS === 'true') {
  app.get('/api/debug/logs', (req, res) => {
    // ...
  });
}
```

**Replace with:**
```javascript
// ✅ NEW - Only in development, never in production
if (!isProd && process.env.ENABLE_DEBUG_LOGS !== 'false') {
  app.get('/api/debug/logs', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    return res.json({ id: req.requestId, logs: ringLogs.slice(-limit) });
  });
  console.log('⚠️ Debug logs endpoint enabled (development only)');
}
```

---

#### 4.5: Improve File Upload Validation

**Install file-type package:**
```bash
npm install file-type
```

**In api-server.js, add at top:**
```javascript
import { fileTypeFromBuffer } from 'file-type';
```

**Find the multer configuration (lines 64-86) and update:**
```javascript
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Only 1 file per request
  },
  fileFilter: async (req, file, cb) => {
    const allowedExt = ['.csv', '.xlsx', '.xls'];
    const allowedMime = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    // ✅ Step 1: Check extension
    if (!allowedExt.includes(ext)) {
      return cb(new Error('Invalid file extension. Only CSV and Excel files are allowed.'));
    }

    // ✅ Step 2: Check MIME type
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error('Invalid MIME type. Only CSV and Excel files are allowed.'));
    }

    cb(null, true);
  }
});

// ✅ Add post-upload validation (check magic bytes)
async function validateFileContent(filePath) {
  const buffer = fs.readFileSync(filePath);
  const type = await fileTypeFromBuffer(buffer);

  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // CSV files may not have a detectable type, so we allow null
  if (type && !allowedTypes.includes(type.mime)) {
    throw new Error('File content does not match allowed types (CSV/Excel)');
  }

  return true;
}

// Use in file upload endpoint (line 439, inside try block, after file check):
if (req.file) {
  await validateFileContent(req.file.path); // ✅ Add this line
}
```

---

### Step 5: Remove Client-Side OpenAI (30 minutes)

#### 5.1: Delete Dangerous File

```bash
# ❌ Remove client-side OpenAI usage
rm src/lib/openai.ts
```

#### 5.2: Update Components to Use Backend

**Find all usages:**
```bash
grep -r "import.*openai" src/
```

**Replace with backend API calls:**

```typescript
// ❌ OLD (insecure - exposes API key)
import { categorizeAnswer } from '@/lib/openai';
const result = await categorizeAnswer({ ... });

// ✅ NEW (secure - uses backend)
const response = await fetch('/api/gpt-test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiToken}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_completion_tokens: 500,
    temperature: 0.1 // Lower for consistent categorization
  })
});

const result = await response.json();
```

---

### Step 6: Install & Configure Sentry (20 minutes)

```bash
# Install Sentry
npm install @sentry/react @sentry/vite-plugin
```

**Update `src/lib/sentry.ts`:**

```typescript
// ❌ DELETE mock implementation (lines 13-22)

// ✅ ADD real Sentry
import * as Sentry from '@sentry/react';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Security: Filter sensitive data
    beforeSend(event) {
      // Remove PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      return event;
    },

    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });

  console.log('✅ Sentry initialized');
}

export function isSentryEnabled(): boolean {
  return !!import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD;
}

// Keep all other functions as-is
```

---

## 🧪 TESTING YOUR FIXES

### Test 1: Verify Dependencies Fixed

```bash
npm audit
# Expected: 0 vulnerabilities (or only low/informational)
```

---

### Test 2: Verify RLS Works

**In Supabase SQL Editor:**

```sql
-- Test as anonymous (should fail)
SELECT * FROM codes;
-- Expected: Error or 0 rows

-- Test as authenticated user
SELECT * FROM codes WHERE user_id = auth.uid();
-- Expected: Success, returns your codes only
```

---

### Test 3: Verify Authentication Required

```bash
# Try to access API without auth token
curl -X POST http://localhost:3001/api/file-upload
# Expected: 401 Unauthorized

# Try with valid token
curl -X POST http://localhost:3001/api/file-upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@test.csv"
# Expected: Success (if file is valid)
```

---

### Test 4: Verify Rate Limiting

```bash
# Send 101 requests in 1 minute (should trigger limit)
for i in {1..101}; do
  curl http://localhost:3001/api/health
done
# Expected: Last requests return 429 Too Many Requests
```

---

### Test 5: Verify CSRF Protection

```bash
# Try POST without CSRF token
curl -X POST http://localhost:3001/api/file-upload \
  -F "file=@test.csv"
# Expected: 403 Forbidden (CSRF token missing)
```

---

## ✅ VERIFICATION CHECKLIST

After completing all steps, verify:

- [ ] `npm audit` shows 0 critical/high vulnerabilities
- [ ] RLS policies enforce user ownership
- [ ] Anonymous users cannot access data
- [ ] API requires authentication
- [ ] CSRF protection is active
- [ ] Rate limiting is working
- [ ] Debug logs disabled in production
- [ ] Client-side OpenAI code removed
- [ ] File uploads validate magic bytes
- [ ] Sentry is tracking errors
- [ ] All `.env` variables are set
- [ ] `.env` file is in `.gitignore`
- [ ] Production deployment tested
- [ ] Security audit report reviewed

---

## 🆘 TROUBLESHOOTING

### Issue: RLS policies block everything

**Solution:** Ensure you're authenticated and your user_id matches:

```sql
-- Check your user ID
SELECT auth.uid();

-- Update data to belong to you
UPDATE codes SET user_id = auth.uid() WHERE user_id IS NULL;
```

---

### Issue: CSRF errors in development

**Solution:** Temporarily disable in dev:

```bash
# In .env
ENABLE_CSRF=false
```

---

### Issue: Rate limiting too strict

**Solution:** Increase limits in development:

```javascript
max: isProd ? 100 : 1000, // Higher in dev
```

---

## 📞 SUPPORT

If you encounter issues:

1. Check error logs: `tail -f logs/app.log`
2. Check Sentry dashboard (if configured)
3. Review Supabase logs
4. Check browser DevTools console
5. Verify `.env` file has all required variables

---

**IMPORTANT:** Do not deploy to production until ALL items in the verification checklist are complete!


