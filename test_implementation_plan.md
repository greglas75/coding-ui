# 🧪 TEST IMPLEMENTATION PLAN - Phase 2

**Date:** 2025-01-18
**Project:** Research Data Categorization App
**Current Coverage:** 13.24% (Target: 40% minimum, 80%+ for critical paths)
**Test Framework:** Vitest 3.2.4 + React Testing Library + Playwright

---

## 📊 EXECUTIVE SUMMARY

### Current State
- ✅ **242 tests passing** (225 unit/integration, 17 E2E)
- ❌ **13.24% coverage** (below 40% threshold)
- ❌ **0% coverage** for API routes (critical security risk)
- ❌ **0% coverage** for encryption utilities (critical security risk)
- ❌ **~3% coverage** for components
- ❌ **~6% coverage** for hooks

### Target State (Phase 2-4)
- 🎯 **40%+ overall coverage** (minimum threshold)
- 🎯 **80%+ coverage** for critical paths (auth, API, encryption, data mutations)
- 🎯 **60%+ coverage** for components
- 🎯 **70%+ coverage** for hooks
- 🎯 **80%+ coverage** for utilities/services

---

## 🚨 PRIORITY 1: CRITICAL SECURITY & DATA INTEGRITY

### 1.1 Authentication & Authorization (0% → 80%+)

**Files to Test:**
- `src/contexts/AuthContext.tsx` (0% coverage)
- `routes/settingsSync.js` - `requireAuth` middleware (0% coverage)
- `api-server.js` - `authenticate` function (0% coverage)

**Test Cases Required:**

#### AuthContext.tsx
```typescript
describe('AuthContext', () => {
  // Happy path
  - signIn with valid credentials → success
  - signUp with valid email/password → success
  - signInWithGoogle → redirects to OAuth
  - signOut → clears session

  // Error cases
  - signIn with invalid credentials → error
  - signUp with weak password → error
  - signIn with network error → error handling

  // Edge cases
  - signIn with empty email → validation error
  - signIn with empty password → validation error
  - useAuth outside provider → throws error

  // State management
  - Initial session loading → loading state
  - Session change event → updates user state
  - Session expiry → clears user
});
```

#### settingsSync.js - requireAuth Middleware
```typescript
describe('requireAuth middleware', () => {
  // Success
  - Valid Bearer token → passes to next()
  - Valid token with user → attaches req.user

  // Error cases
  - Missing Authorization header → 401
  - Invalid token format → 401
  - Expired token → 401
  - Invalid token → 401
  - Network error during verification → 500
});
```

**Estimated Tests:** 20
**Estimated Coverage Gain:** +5%
**Priority:** 🔴 CRITICAL

---

### 1.2 Encryption Utilities (3.29% → 80%+)

**Files to Test:**
- `src/utils/encryption.ts` (3.29% coverage)

**Test Cases Required:**

```typescript
describe('encryption.ts', () => {
  // encrypt/decrypt
  - encrypt plaintext → returns base64 string
  - decrypt encrypted data → returns original plaintext
  - encrypt with same password → different output (salt/IV)
  - decrypt with wrong password → throws error
  - decrypt corrupted data → throws error
  - encrypt empty string → handles gracefully
  - encrypt large data → handles correctly

  // obfuscate/deobfuscate
  - obfuscate data → returns obfuscated string
  - deobfuscate obfuscated → returns original
  - deobfuscate invalid data → returns as-is (backward compat)

  // isCryptoAvailable
  - isCryptoAvailable → returns boolean
  - isCryptoAvailable in Node.js → returns false
});
```

**Estimated Tests:** 15
**Estimated Coverage Gain:** +2%
**Priority:** 🔴 CRITICAL

---

### 1.3 Settings Encryption (0% → 80%+)

**Files to Test:**
- `lib/settingsEncryption.js` (0% coverage)

**Test Cases Required:**

```typescript
describe('settingsEncryption.js', () => {
  // encryptSettings/decryptSettings
  - encryptSettings → returns encrypted string
  - decryptSettings → returns original settings
  - encryptSettings with invalid key → throws error
  - decryptSettings with wrong key → throws error

  // validateSettingsStructure
  - Valid settings object → returns true
  - Invalid settings structure → returns false
  - Missing required fields → returns false
  - Extra fields → returns true (allows)

  // sanitizeSettings
  - Removes empty values → cleaned object
  - Preserves valid values → unchanged
  - Handles nested objects → recursively sanitizes

  // getDeviceInfo
  - Extracts device name from User-Agent
  - Extracts browser name from User-Agent
  - Handles missing User-Agent → defaults
});
```

**Estimated Tests:** 18
**Estimated Coverage Gain:** +2%
**Priority:** 🔴 CRITICAL

---

## 🔥 PRIORITY 2: API ROUTES (0% → 80%+)

### 2.1 File Upload Endpoint (0% → 80%+)

**File to Test:**
- `api-server.js` - `/api/file-upload` endpoint (lines 717-985)

**Test Cases Required:**

```typescript
describe('POST /api/file-upload', () => {
  // Success cases
  - Upload valid CSV → returns parsed data
  - Upload valid Excel → returns parsed data
  - Upload with category_id → saves to database
  - Upload large file → handles correctly

  // Validation errors
  - No file uploaded → 400
  - Invalid file type → 400
  - Invalid magic bytes → 400 (security)
  - Missing category_id → 400
  - Invalid category_id → 404

  // Security tests
  - Malicious file (executable) → rejected
  - File with wrong extension → rejected
  - File too large → rejected (if limit set)

  // Error cases
  - Database error → 500
  - Parse error → 400 with details
  - File system error → 500
});
```

**Estimated Tests:** 25
**Estimated Coverage Gain:** +3%
**Priority:** 🔴 CRITICAL

---

### 2.2 Codes API Routes (0% → 80%+)

**File to Test:**
- `routes/codes.js` (520 lines, 0% coverage)

**Test Cases Required:**

#### POST /api/v1/codes/bulk-create
```typescript
describe('POST /api/v1/codes/bulk-create', () => {
  // Success
  - Create multiple codes → returns created codes
  - Assign codes to category → success
  - Create codes with valid names → success

  // Validation
  - Missing category_id → 400
  - Invalid category_id → 404
  - Empty code_names array → 400
  - Invalid code_names format → 400

  // Error cases
  - Database insert error → 500 + rollback
  - Category assignment error → 500 + rollback
  - Rate limit exceeded → 429
});
```

#### POST /api/v1/codes/ai-discover
```typescript
describe('POST /api/v1/codes/ai-discover', () => {
  // Success
  - Discover codes from answers → returns codes
  - Filter by min_frequency → returns filtered
  - Limit results → respects limit

  // Validation
  - Missing category_id → 400
  - Invalid category_id → 404
  - No answers found → returns empty array

  // Error cases
  - AI API error → 500
  - Database error → 500
  - Rate limit exceeded → 429
});
```

**Estimated Tests:** 30
**Estimated Coverage Gain:** +4%
**Priority:** 🟠 HIGH

---

### 2.3 Settings Sync Routes (0% → 80%+)

**File to Test:**
- `routes/settingsSync.js` (334 lines, 0% coverage)

**Test Cases Required:**

#### GET /api/settings-sync
```typescript
describe('GET /api/settings-sync', () => {
  // Success
  - Fetch user settings → returns decrypted settings
  - No settings found → returns null
  - Settings with version → returns version info

  // Error cases
  - Unauthorized → 401
  - Decryption error → 500
  - Database error → 500
});
```

#### POST /api/settings-sync
```typescript
describe('POST /api/settings-sync', () => {
  // Success
  - Save new settings → returns version
  - Update existing settings → increments version
  - Settings with device info → saves device info

  // Validation
  - Missing settings object → 400
  - Invalid settings structure → 400
  - Encryption error → 500

  // Error cases
  - Unauthorized → 401
  - Database error → 500
});
```

#### GET /api/settings-sync/history
```typescript
describe('GET /api/settings-sync/history', () => {
  - Fetch history → returns history array
  - Limit parameter → respects limit (max 50)
  - No history → returns empty array
  - Unauthorized → 401
});
```

#### POST /api/settings-sync/restore/:version
```typescript
describe('POST /api/settings-sync/restore/:version', () => {
  - Restore valid version → success
  - Invalid version number → 400
  - Version not found → 404
  - Unauthorized → 401
});
```

**Estimated Tests:** 28
**Estimated Coverage Gain:** +3%
**Priority:** 🟠 HIGH

---

### 2.4 Cost Dashboard Routes (0% → 80%+)

**File to Test:**
- `routes/costDashboard.js` (0% coverage)

**Test Cases Required:**

```typescript
describe('Cost Dashboard Routes', () => {
  // GET /api/cost-dashboard/summary
  - Fetch cost summary → returns summary
  - Filter by date range → filtered results
  - Filter by model → filtered results

  // GET /api/cost-dashboard/usage
  - Fetch usage logs → returns logs
  - Pagination → works correctly
  - Filtering → works correctly

  // POST /api/cost-dashboard/budget
  - Set budget → success
  - Invalid budget amount → 400
  - Unauthorized → 401
});
```

**Estimated Tests:** 20
**Estimated Coverage Gain:** +2%
**Priority:** 🟠 HIGH

---

## 🟡 PRIORITY 3: SERVICES & UTILITIES

### 3.1 API Client (0% → 80%+)

**File to Test:**
- `src/services/apiClient.ts` (605 lines, 0% coverage)

**Test Cases Required:**

```typescript
describe('apiClient.ts', () => {
  // HTTP methods
  - GET request → success
  - POST request → success
  - PUT request → success
  - DELETE request → success

  // Error handling
  - Network error → retries with backoff
  - 500 error → retries
  - 400 error → no retry
  - Timeout → retries

  // Validation
  - Zod schema validation → validates response
  - Invalid response → throws error

  // Configuration
  - Custom timeout → respects timeout
  - Custom retries → respects retry count
  - Custom headers → includes headers
});
```

**Estimated Tests:** 25
**Estimated Coverage Gain:** +3%
**Priority:** 🟡 MEDIUM

---

### 3.2 Supabase Helpers (0% → 80%+)

**File to Test:**
- `src/lib/supabase.ts` (727 lines, partial coverage)

**Test Cases Required:**

```typescript
describe('supabase.ts', () => {
  // fetchCodes, createCode, etc.
  - fetchCodes → returns codes
  - createCode → creates code
  - saveCodesForAnswer → saves codes
  - fetchAISuggestion → returns suggestion

  // Caching
  - Cache hit → returns cached data
  - Cache miss → fetches from API
  - Cache expiry → refetches

  // Optimistic updates
  - Optimistic update → updates UI immediately
  - Update fails → rolls back

  // Batch operations
  - batchUpdate → updates multiple
  - Batch error → handles gracefully
});
```

**Estimated Tests:** 30
**Estimated Coverage Gain:** +4%
**Priority:** 🟡 MEDIUM

---

## 🟢 PRIORITY 4: COMPONENTS & HOOKS

### 4.1 Critical Components (3% → 60%+)

**Files to Test:**
- `src/components/CodingGrid/index.tsx` (17 tests failing - fix first)
- `src/components/CategoriesList.tsx` (0% coverage)
- `src/components/CodeListTable.tsx` (22 tests - expand)

**Test Cases Required:**

#### CodingGrid
```typescript
describe('CodingGrid', () => {
  // Fix existing failing tests first
  - Render with answers → displays table
  - Filters → apply filters
  - Keyboard shortcuts → work correctly
  - Batch operations → work correctly
});
```

#### CategoriesList
```typescript
describe('CategoriesList', () => {
  - Render categories → displays list
  - Create category → creates new
  - Edit category → updates
  - Delete category → deletes
  - Search categories → filters
});
```

**Estimated Tests:** 40
**Estimated Coverage Gain:** +5%
**Priority:** 🟢 LOW (after critical paths)

---

### 4.2 Custom Hooks (6% → 70%+)

**Files to Test:**
- `src/hooks/useCategories.ts` (0% coverage)
- `src/hooks/useCodes.ts` (0% coverage)
- `src/hooks/useAnswers.ts` (0% coverage)

**Test Cases Required:**

```typescript
describe('useCategories', () => {
  - Fetch categories → returns data
  - Loading state → shows loading
  - Error state → shows error
  - Refetch → updates data
});
```

**Estimated Tests:** 25
**Estimated Coverage Gain:** +3%
**Priority:** 🟢 LOW

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 2.1: Critical Security (Week 1)
1. ✅ Fix CodingGrid.test.tsx (17 failing tests)
2. Write tests for `AuthContext.tsx` (20 tests)
3. Write tests for `encryption.ts` (15 tests)
4. Write tests for `settingsEncryption.js` (18 tests)
5. Write tests for `requireAuth` middleware (10 tests)

**Target:** +10% coverage (13% → 23%)

---

### Phase 2.2: API Routes (Week 2)
1. Write tests for `/api/file-upload` (25 tests)
2. Write tests for `routes/codes.js` (30 tests)
3. Write tests for `routes/settingsSync.js` (28 tests)
4. Write tests for `routes/costDashboard.js` (20 tests)

**Target:** +12% coverage (23% → 35%)

---

### Phase 2.3: Services & Utilities (Week 3)
1. Write tests for `apiClient.ts` (25 tests)
2. Write tests for `supabase.ts` helpers (30 tests)
3. Write tests for other utilities (20 tests)

**Target:** +7% coverage (35% → 42%)

---

### Phase 2.4: Components & Hooks (Week 4)
1. Expand component tests (40 tests)
2. Write hook tests (25 tests)
3. Integration tests (20 tests)

**Target:** +8% coverage (42% → 50%)

---

## 🎯 SUCCESS METRICS

### Coverage Targets
- **Overall:** 40%+ (minimum threshold)
- **Critical paths:** 80%+ (auth, API, encryption)
- **Components:** 60%+
- **Hooks:** 70%+
- **Services:** 80%+

### Quality Metrics
- ✅ All tests pass
- ✅ No flaky tests
- ✅ Tests run in <30s
- ✅ Clear test descriptions
- ✅ AAA pattern (Arrange-Act-Assert)

---

## 🛠️ TESTING INFRASTRUCTURE

### Setup Required
- ✅ Vitest configured
- ✅ Coverage reporting enabled
- ✅ MSW for API mocking
- ✅ Test utilities/helpers
- ✅ CI/CD workflow

### Mocking Strategy
- **Supabase:** Mock `@supabase/supabase-js` client
- **API Routes:** Use MSW handlers
- **File System:** Mock `fs` module
- **Crypto:** Mock `window.crypto` for encryption tests

---

## 📝 NEXT STEPS

1. **Start with Priority 1.1:** Fix CodingGrid tests, then write AuthContext tests
2. **Create test utilities:** Helper functions for common test patterns
3. **Set up API route testing:** Use `supertest` or MSW for Express routes
4. **Generate coverage report:** After each batch of tests
5. **Update this plan:** As we discover gaps

---

**Last Updated:** 2025-01-18
**Status:** Ready for implementation
**Next Action:** Fix CodingGrid tests, then start Priority 1.1

