# 📊 COMPREHENSIVE TEST COVERAGE AUDIT REPORT

**Date:** 2025-01-18
**Project:** Research Data Categorization App
**Test Framework:** Vitest 3.2.4 + React Testing Library + Playwright

---

## Phase 1: CURRENT STATE ANALYSIS

### Test Infrastructure ✅

**Frameworks in Use:**

- ✅ **Vitest 3.2.4** - Unit/Integration tests
- ✅ **React Testing Library** - Component tests
- ✅ **Playwright** - E2E tests (47 test files)
- ✅ **MSW (Mock Service Worker)** - API mocking
- ✅ **@vitest/coverage-v8** - Coverage reporting

**Configuration:**

- ✅ `vitest.config.ts` configured with jsdom environment
- ✅ Coverage thresholds: 40% (lines, functions, branches, statements)
- ✅ Test setup files: `src/test/setup.ts`, `src/test/globalSetup.ts`
- ✅ MSW handlers configured in `src/test/mocks/`

---

## CURRENT TEST STATISTICS

### Test Files Count

**Unit/Integration Tests:**

- `src/__tests__/` - 14 test files
  - 9 TypeScript test files (.test.ts)
  - 5 React component test files (.test.tsx)

**E2E Tests:**

- `e2e/tests/` - 47 Playwright test files

**Total Test Files:** 61

### Test Execution Results

**Current Status:**

- ✅ **225 tests passing**
- ❌ **17 tests failing** (CodingGrid.test.tsx - import issues after refactoring)
- **Total:** 242 tests

**Test Files Breakdown:**

```
✅ src/__tests__/api/categorize.test.ts (4 tests)
✅ src/__tests__/modelRouter.test.ts (35 tests)
✅ src/__tests__/AISettingsPanel.test.tsx
✅ src/__tests__/CodeSuggestions.test.tsx
✅ src/__tests__/CodeListTable.test.tsx (22 tests)
✅ src/__tests__/ExportImportModal.test.tsx (26 tests)
✅ src/__tests__/hooks/useAcceptSuggestion.test.ts
✅ src/__tests__/hooks/useCategorizeAnswer.test.ts
✅ src/__tests__/lib/openai.test.ts
✅ src/__tests__/lib/batchAIProcessor.test.ts
✅ src/__tests__/cacheLayer.test.ts
✅ src/__tests__/translationHelper.test.ts
✅ src/__tests__/webContextProvider.test.ts
❌ src/__tests__/CodingGrid.test.tsx (17 tests - FAILING)
```

---

## SOURCE CODE ANALYSIS

### Total Source Files

**Files Requiring Tests:**

- **287 TypeScript/TSX files** in `src/` directory
- Excludes: test files, config files, type definitions

### File Distribution by Category

**Components:** ~172 files

- React components (.tsx)
- Sub-components
- Modals, tables, forms

**Hooks:** 33 files

- Custom React hooks
- Data fetching hooks
- UI interaction hooks

**Services:** 10 files

- API clients
- External service integrations
- Business logic services

**Libraries (lib/):** 31 files

- Utility functions
- Data processing
- AI integrations
- Supabase helpers

**Pages:** 7 files

- Route components
- Main page components

**Other:**

- Schemas (7 files)
- Types (4 files)
- Utils (4 files)
- Contexts (1 file)
- Repositories (1 file)

---

## CRITICAL PATHS ANALYSIS

### 🔴 CRITICAL - No Tests Found

#### 1. Authentication & Security

**Files:**

- `src/contexts/AuthContext.tsx` - **NO TESTS**
  - `signIn()`, `signUp()`, `signInWithGoogle()`, `signOut()`
  - Session management
  - Auth state changes

- `src/components/Auth/AuthDialog.tsx` - **NO TESTS**
  - Login form
  - Registration form
  - OAuth integration

**Risk:** Authentication is critical for security. No tests = high risk of regressions.

#### 2. API Endpoints (Backend)

**Files:**

- `api-server.js` - **NO TESTS**
  - 11+ API endpoints
  - Authentication middleware
  - Rate limiting
  - File upload handling
  - CSRF protection

**Routes:**

- `routes/codeframe.js` - **NO TESTS**
- `routes/codes.js` - **NO TESTS**
- `routes/costDashboard.js` - **NO TESTS**
- `routes/sentiment.js` - **NO TESTS**
- `routes/settingsSync.js` - **NO TESTS** (encryption/decryption)
- `routes/test-image-search.js` - **NO TESTS**

**Risk:** Backend API has no test coverage. Critical for data integrity.

#### 3. Data Mutations & Business Logic

**Files:**

- `src/lib/supabase.ts` (727 lines) - **NO TESTS**
  - Database operations (CRUD)
  - Optimistic updates
  - Batch operations
  - Caching logic

- `src/lib/batchAIProcessor.ts` - **PARTIAL** (has tests but may need more)
- `src/lib/openai.ts` (1,285 lines) - **PARTIAL** (has basic tests)

- `src/hooks/useAcceptSuggestion.ts` - **PARTIAL** (has tests)
- `src/hooks/useCategorizeAnswer.ts` - **PARTIAL** (has tests)

#### 4. Payment/Cost Tracking

**Files:**

- `src/hooks/useAIPricing.ts` - **NO TESTS**
- `src/hooks/useCostOverview.ts` - **NO TESTS**
- `src/hooks/useCostDetailed.ts` - **NO TESTS**
- `src/hooks/useCostTrend.ts` - **NO TESTS**
- `src/hooks/useCostPredictions.ts` - **NO TESTS**
- `src/pages/CostDashboardPage.tsx` - **NO TESTS**
- `routes/costDashboard.js` - **NO TESTS**

**Risk:** Cost tracking is critical for budget management.

#### 5. Settings & Encryption

**Files:**

- `routes/settingsSync.js` - **NO TESTS**
  - Settings encryption/decryption
  - Multi-device sync
  - Version conflict resolution

- `src/utils/encryption.ts` - **NO TESTS**
- `src/hooks/useSettingsSync.ts` - **NO TESTS**

**Risk:** Encryption logic must be tested to ensure data security.

---

### 🟠 HIGH PRIORITY - Partial Coverage

#### 1. Core Components

**Files with Partial/No Tests:**

- `src/components/CodingGrid/index.tsx` (973 lines) - **FAILING TESTS** (needs fix)
- `src/components/SelectCodeModal.tsx` (870 lines) - **NO TESTS**
- `src/pages/SettingsPage.tsx` (1,388 lines) - **NO TESTS**
- `src/pages/CategoriesPage.tsx` (795 lines) - **NO TESTS**
- `src/components/CodeframeBuilderModal.tsx` (552 lines) - **NO TESTS**

#### 2. Hooks

**33 hooks total, only 2 have tests:**

- ✅ `useAcceptSuggestion.ts` - has tests
- ✅ `useCategorizeAnswer.ts` - has tests
- ❌ **31 hooks without tests**

**Critical Hooks Missing Tests:**

- `useOfflineSync.ts` - Offline functionality
- `useUndoRedo.ts` - Undo/redo logic
- `useBatchSelection.ts` - Batch operations
- `useFilters.ts` - Filtering logic
- `useCategoriesQuery.ts` - Data fetching
- `useCodesQuery.ts` - Data fetching
- `useAnswersQuery.ts` - Data fetching

#### 3. Services

**10 services, only 1-2 have tests:**

- ✅ `cacheLayer.ts` - has tests
- ❌ `apiClient.ts` - **NO TESTS**
- ❌ `brandValidator.ts` - **NO TESTS**
- ❌ `multiSourceValidator.ts` - **NO TESTS**
- ❌ `translationHelper.ts` - **PARTIAL** (has some tests)
- ❌ `modelRouter.ts` - **PARTIAL** (has tests but may need more)
- ❌ `geminiVision.ts` - **NO TESTS**
- ❌ `languageDetector.ts` - **NO TESTS**
- ❌ `llmClient.ts` - **NO TESTS**
- ❌ `webContextProvider.ts` - **PARTIAL** (has tests)

---

### 🟡 MEDIUM PRIORITY

#### 1. Utility Functions

**Files:**

- `src/lib/dateUtils.ts` - **NO TESTS**
- `src/lib/debounce.ts` - **NO TESTS**
- `src/lib/duplicateHelpers.ts` - **NO TESTS**
- `src/lib/statusNormalization.ts` - **NO TESTS**
- `src/utils/logger.ts` - **NO TESTS**
- `src/utils/pii.ts` - **NO TESTS**

#### 2. UI Components

**Many components without tests:**

- Modals (various)
- Tables (various)
- Forms (various)
- Dashboard components

---

## COVERAGE ESTIMATION

### Current Coverage (Estimated)

Based on test file analysis:

**Coverage by Category:**

- **Hooks:** ~6% (2/33 tested)
- **Services:** ~20% (2-3/10 tested)
- **Components:** ~3% (5/172 tested)
- **Lib/Utils:** ~10% (3-4/31 tested)
- **Pages:** 0% (0/7 tested)
- **API Routes:** 0% (0/6+ tested)

**Overall Estimated Coverage:** ~5-10%

**Target Coverage (from vitest.config.ts):**

- Lines: 40% (current threshold)
- Functions: 40%
- Branches: 40%
- Statements: 40%

**Gap:** Need to increase coverage by 30-35% to meet thresholds.

---

## PRIORITIZED TEST IMPLEMENTATION PLAN

### 🔴 CRITICAL PRIORITY (Do First)

#### 1. Authentication & Security

**Files:**

- `src/contexts/AuthContext.tsx`
- `src/components/Auth/AuthDialog.tsx`
- `api-server.js` (authentication middleware)

**Test Cases Needed:**

- Sign in success/failure
- Sign up success/failure
- OAuth flow
- Session management
- Auth state changes
- Error handling
- Token validation

**Estimated Tests:** 20-30

#### 2. API Endpoints (Backend)

**Files:**

- `api-server.js` (all endpoints)
- `routes/*.js` (all route files)

**Test Cases Needed:**

- All HTTP methods (GET, POST, PUT, DELETE)
- Request validation
- Response formats
- Error handling
- Rate limiting
- Authentication checks
- File upload handling

**Estimated Tests:** 50-80

#### 3. Data Mutations (Supabase)

**Files:**

- `src/lib/supabase.ts`

**Test Cases Needed:**

- CRUD operations
- Optimistic updates
- Batch operations
- Error handling
- Caching behavior
- Transaction rollback

**Estimated Tests:** 30-40

#### 4. Settings Encryption

**Files:**

- `routes/settingsSync.js`
- `src/utils/encryption.ts`
- `src/hooks/useSettingsSync.ts`

**Test Cases Needed:**

- Encryption/decryption
- Multi-device sync
- Version conflicts
- Data integrity

**Estimated Tests:** 15-20

---

### 🟠 HIGH PRIORITY

#### 1. Core Hooks (Data Fetching)

**Files:**

- `src/hooks/useCategoriesQuery.ts`
- `src/hooks/useCodesQuery.ts`
- `src/hooks/useAnswersQuery.ts`
- `src/hooks/useOfflineSync.ts`
- `src/hooks/useUndoRedo.ts`
- `src/hooks/useBatchSelection.ts`

**Estimated Tests:** 40-50

#### 2. Large Components

**Files:**

- `src/components/CodingGrid/index.tsx` (fix existing tests)
- `src/components/SelectCodeModal.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/CategoriesPage.tsx`

**Estimated Tests:** 60-80

#### 3. Services

**Files:**

- `src/services/apiClient.ts`
- `src/services/multiSourceValidator.ts`
- `src/services/brandValidator.ts`

**Estimated Tests:** 30-40

---

### 🟡 MEDIUM PRIORITY

#### 1. Utility Functions

**Files:**

- `src/lib/dateUtils.ts`
- `src/lib/debounce.ts`
- `src/lib/duplicateHelpers.ts`
- `src/lib/statusNormalization.ts`

**Estimated Tests:** 20-30

#### 2. Remaining Hooks

**Files:**

- All other hooks (25+ files)

**Estimated Tests:** 50-60

#### 3. UI Components

**Files:**

- Various modals, tables, forms

**Estimated Tests:** 80-100

---

## TEST INFRASTRUCTURE IMPROVEMENTS NEEDED

### 1. Fix Existing Issues

- ❌ Fix `CodingGrid.test.tsx` import errors (TableHeader)
- ✅ Ensure all tests pass before adding new ones

### 2. Coverage Reporting

- ✅ Configure coverage thresholds
- ⚠️ Generate initial coverage report
- ⚠️ Set up CI/CD coverage tracking

### 3. Test Utilities

- ✅ MSW handlers exist
- ⚠️ May need additional mocks for:
  - Supabase client
  - File uploads
  - WebSocket connections
  - IndexedDB (offline storage)

### 4. Test Data/Fixtures

- ✅ Some fixtures exist in `src/test/fixtures/`
- ⚠️ May need more comprehensive fixtures

---

## ESTIMATED EFFORT

### Total Tests Needed

**Critical:** 115-170 tests
**High:** 130-170 tests
**Medium:** 150-190 tests
**Total:** ~395-530 new tests

### Time Estimation

**Critical Priority:** 2-3 weeks
**High Priority:** 2-3 weeks
**Medium Priority:** 2-3 weeks
**Total:** 6-9 weeks (with 1 developer)

---

## NEXT STEPS

1. ✅ **Fix failing tests** (CodingGrid.test.tsx)
2. ⚠️ **Generate coverage report** (run `npm run test:coverage`)
3. ⚠️ **Create detailed test implementation plan** (test_implementation_plan.md)
4. ⚠️ **Start with Critical Priority tests**
5. ⚠️ **Set up CI/CD test automation**

---

## NOTES

- Current test infrastructure is good (Vitest, RTL, MSW, Playwright)
- Main gap is in test coverage, not infrastructure
- Focus on critical paths first (auth, API, data mutations)
- E2E tests exist (47 files) but unit/integration coverage is low

**Date:** 2025-01-18
**Project:** Research Data Categorization App
**Test Framework:** Vitest 3.2.4 + React Testing Library + Playwright

---

## Phase 1: CURRENT STATE ANALYSIS

### Test Infrastructure ✅

**Frameworks in Use:**

- ✅ **Vitest 3.2.4** - Unit/Integration tests
- ✅ **React Testing Library** - Component tests
- ✅ **Playwright** - E2E tests (47 test files)
- ✅ **MSW (Mock Service Worker)** - API mocking
- ✅ **@vitest/coverage-v8** - Coverage reporting

**Configuration:**

- ✅ `vitest.config.ts` configured with jsdom environment
- ✅ Coverage thresholds: 40% (lines, functions, branches, statements)
- ✅ Test setup files: `src/test/setup.ts`, `src/test/globalSetup.ts`
- ✅ MSW handlers configured in `src/test/mocks/`

---

## CURRENT TEST STATISTICS

### Test Files Count

**Unit/Integration Tests:**

- `src/__tests__/` - 14 test files
  - 9 TypeScript test files (.test.ts)
  - 5 React component test files (.test.tsx)

**E2E Tests:**

- `e2e/tests/` - 47 Playwright test files

**Total Test Files:** 61

### Test Execution Results

**Current Status:**

- ✅ **225 tests passing**
- ❌ **17 tests failing** (CodingGrid.test.tsx - import issues after refactoring)
- **Total:** 242 tests

**Test Files Breakdown:**

```
✅ src/__tests__/api/categorize.test.ts (4 tests)
✅ src/__tests__/modelRouter.test.ts (35 tests)
✅ src/__tests__/AISettingsPanel.test.tsx
✅ src/__tests__/CodeSuggestions.test.tsx
✅ src/__tests__/CodeListTable.test.tsx (22 tests)
✅ src/__tests__/ExportImportModal.test.tsx (26 tests)
✅ src/__tests__/hooks/useAcceptSuggestion.test.ts
✅ src/__tests__/hooks/useCategorizeAnswer.test.ts
✅ src/__tests__/lib/openai.test.ts
✅ src/__tests__/lib/batchAIProcessor.test.ts
✅ src/__tests__/cacheLayer.test.ts
✅ src/__tests__/translationHelper.test.ts
✅ src/__tests__/webContextProvider.test.ts
❌ src/__tests__/CodingGrid.test.tsx (17 tests - FAILING)
```

---

## SOURCE CODE ANALYSIS

### Total Source Files

**Files Requiring Tests:**

- **287 TypeScript/TSX files** in `src/` directory
- Excludes: test files, config files, type definitions

### File Distribution by Category

**Components:** ~172 files

- React components (.tsx)
- Sub-components
- Modals, tables, forms

**Hooks:** 33 files

- Custom React hooks
- Data fetching hooks
- UI interaction hooks

**Services:** 10 files

- API clients
- External service integrations
- Business logic services

**Libraries (lib/):** 31 files

- Utility functions
- Data processing
- AI integrations
- Supabase helpers

**Pages:** 7 files

- Route components
- Main page components

**Other:**

- Schemas (7 files)
- Types (4 files)
- Utils (4 files)
- Contexts (1 file)
- Repositories (1 file)

---

## CRITICAL PATHS ANALYSIS

### 🔴 CRITICAL - No Tests Found

#### 1. Authentication & Security

**Files:**

- `src/contexts/AuthContext.tsx` - **NO TESTS**
  - `signIn()`, `signUp()`, `signInWithGoogle()`, `signOut()`
  - Session management
  - Auth state changes

- `src/components/Auth/AuthDialog.tsx` - **NO TESTS**
  - Login form
  - Registration form
  - OAuth integration

**Risk:** Authentication is critical for security. No tests = high risk of regressions.

#### 2. API Endpoints (Backend)

**Files:**

- `api-server.js` - **NO TESTS**
  - 11+ API endpoints
  - Authentication middleware
  - Rate limiting
  - File upload handling
  - CSRF protection

**Routes:**

- `routes/codeframe.js` - **NO TESTS**
- `routes/codes.js` - **NO TESTS**
- `routes/costDashboard.js` - **NO TESTS**
- `routes/sentiment.js` - **NO TESTS**
- `routes/settingsSync.js` - **NO TESTS** (encryption/decryption)
- `routes/test-image-search.js` - **NO TESTS**

**Risk:** Backend API has no test coverage. Critical for data integrity.

#### 3. Data Mutations & Business Logic

**Files:**

- `src/lib/supabase.ts` (727 lines) - **NO TESTS**
  - Database operations (CRUD)
  - Optimistic updates
  - Batch operations
  - Caching logic

- `src/lib/batchAIProcessor.ts` - **PARTIAL** (has tests but may need more)
- `src/lib/openai.ts` (1,285 lines) - **PARTIAL** (has basic tests)

- `src/hooks/useAcceptSuggestion.ts` - **PARTIAL** (has tests)
- `src/hooks/useCategorizeAnswer.ts` - **PARTIAL** (has tests)

#### 4. Payment/Cost Tracking

**Files:**

- `src/hooks/useAIPricing.ts` - **NO TESTS**
- `src/hooks/useCostOverview.ts` - **NO TESTS**
- `src/hooks/useCostDetailed.ts` - **NO TESTS**
- `src/hooks/useCostTrend.ts` - **NO TESTS**
- `src/hooks/useCostPredictions.ts` - **NO TESTS**
- `src/pages/CostDashboardPage.tsx` - **NO TESTS**
- `routes/costDashboard.js` - **NO TESTS**

**Risk:** Cost tracking is critical for budget management.

#### 5. Settings & Encryption

**Files:**

- `routes/settingsSync.js` - **NO TESTS**
  - Settings encryption/decryption
  - Multi-device sync
  - Version conflict resolution

- `src/utils/encryption.ts` - **NO TESTS**
- `src/hooks/useSettingsSync.ts` - **NO TESTS**

**Risk:** Encryption logic must be tested to ensure data security.

---

### 🟠 HIGH PRIORITY - Partial Coverage

#### 1. Core Components

**Files with Partial/No Tests:**

- `src/components/CodingGrid/index.tsx` (973 lines) - **FAILING TESTS** (needs fix)
- `src/components/SelectCodeModal.tsx` (870 lines) - **NO TESTS**
- `src/pages/SettingsPage.tsx` (1,388 lines) - **NO TESTS**
- `src/pages/CategoriesPage.tsx` (795 lines) - **NO TESTS**
- `src/components/CodeframeBuilderModal.tsx` (552 lines) - **NO TESTS**

#### 2. Hooks

**33 hooks total, only 2 have tests:**

- ✅ `useAcceptSuggestion.ts` - has tests
- ✅ `useCategorizeAnswer.ts` - has tests
- ❌ **31 hooks without tests**

**Critical Hooks Missing Tests:**

- `useOfflineSync.ts` - Offline functionality
- `useUndoRedo.ts` - Undo/redo logic
- `useBatchSelection.ts` - Batch operations
- `useFilters.ts` - Filtering logic
- `useCategoriesQuery.ts` - Data fetching
- `useCodesQuery.ts` - Data fetching
- `useAnswersQuery.ts` - Data fetching

#### 3. Services

**10 services, only 1-2 have tests:**

- ✅ `cacheLayer.ts` - has tests
- ❌ `apiClient.ts` - **NO TESTS**
- ❌ `brandValidator.ts` - **NO TESTS**
- ❌ `multiSourceValidator.ts` - **NO TESTS**
- ❌ `translationHelper.ts` - **PARTIAL** (has some tests)
- ❌ `modelRouter.ts` - **PARTIAL** (has tests but may need more)
- ❌ `geminiVision.ts` - **NO TESTS**
- ❌ `languageDetector.ts` - **NO TESTS**
- ❌ `llmClient.ts` - **NO TESTS**
- ❌ `webContextProvider.ts` - **PARTIAL** (has tests)

---

### 🟡 MEDIUM PRIORITY

#### 1. Utility Functions

**Files:**

- `src/lib/dateUtils.ts` - **NO TESTS**
- `src/lib/debounce.ts` - **NO TESTS**
- `src/lib/duplicateHelpers.ts` - **NO TESTS**
- `src/lib/statusNormalization.ts` - **NO TESTS**
- `src/utils/logger.ts` - **NO TESTS**
- `src/utils/pii.ts` - **NO TESTS**

#### 2. UI Components

**Many components without tests:**

- Modals (various)
- Tables (various)
- Forms (various)
- Dashboard components

---

## COVERAGE ESTIMATION

### Current Coverage (Estimated)

Based on test file analysis:

**Coverage by Category:**

- **Hooks:** ~6% (2/33 tested)
- **Services:** ~20% (2-3/10 tested)
- **Components:** ~3% (5/172 tested)
- **Lib/Utils:** ~10% (3-4/31 tested)
- **Pages:** 0% (0/7 tested)
- **API Routes:** 0% (0/6+ tested)

**Overall Estimated Coverage:** ~5-10%

**Target Coverage (from vitest.config.ts):**

- Lines: 40% (current threshold)
- Functions: 40%
- Branches: 40%
- Statements: 40%

**Gap:** Need to increase coverage by 30-35% to meet thresholds.

---

## PRIORITIZED TEST IMPLEMENTATION PLAN

### 🔴 CRITICAL PRIORITY (Do First)

#### 1. Authentication & Security

**Files:**

- `src/contexts/AuthContext.tsx`
- `src/components/Auth/AuthDialog.tsx`
- `api-server.js` (authentication middleware)

**Test Cases Needed:**

- Sign in success/failure
- Sign up success/failure
- OAuth flow
- Session management
- Auth state changes
- Error handling
- Token validation

**Estimated Tests:** 20-30

#### 2. API Endpoints (Backend)

**Files:**

- `api-server.js` (all endpoints)
- `routes/*.js` (all route files)

**Test Cases Needed:**

- All HTTP methods (GET, POST, PUT, DELETE)
- Request validation
- Response formats
- Error handling
- Rate limiting
- Authentication checks
- File upload handling

**Estimated Tests:** 50-80

#### 3. Data Mutations (Supabase)

**Files:**

- `src/lib/supabase.ts`

**Test Cases Needed:**

- CRUD operations
- Optimistic updates
- Batch operations
- Error handling
- Caching behavior
- Transaction rollback

**Estimated Tests:** 30-40

#### 4. Settings Encryption

**Files:**

- `routes/settingsSync.js`
- `src/utils/encryption.ts`
- `src/hooks/useSettingsSync.ts`

**Test Cases Needed:**

- Encryption/decryption
- Multi-device sync
- Version conflicts
- Data integrity

**Estimated Tests:** 15-20

---

### 🟠 HIGH PRIORITY

#### 1. Core Hooks (Data Fetching)

**Files:**

- `src/hooks/useCategoriesQuery.ts`
- `src/hooks/useCodesQuery.ts`
- `src/hooks/useAnswersQuery.ts`
- `src/hooks/useOfflineSync.ts`
- `src/hooks/useUndoRedo.ts`
- `src/hooks/useBatchSelection.ts`

**Estimated Tests:** 40-50

#### 2. Large Components

**Files:**

- `src/components/CodingGrid/index.tsx` (fix existing tests)
- `src/components/SelectCodeModal.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/CategoriesPage.tsx`

**Estimated Tests:** 60-80

#### 3. Services

**Files:**

- `src/services/apiClient.ts`
- `src/services/multiSourceValidator.ts`
- `src/services/brandValidator.ts`

**Estimated Tests:** 30-40

---

### 🟡 MEDIUM PRIORITY

#### 1. Utility Functions

**Files:**

- `src/lib/dateUtils.ts`
- `src/lib/debounce.ts`
- `src/lib/duplicateHelpers.ts`
- `src/lib/statusNormalization.ts`

**Estimated Tests:** 20-30

#### 2. Remaining Hooks

**Files:**

- All other hooks (25+ files)

**Estimated Tests:** 50-60

#### 3. UI Components

**Files:**

- Various modals, tables, forms

**Estimated Tests:** 80-100

---

## TEST INFRASTRUCTURE IMPROVEMENTS NEEDED

### 1. Fix Existing Issues

- ❌ Fix `CodingGrid.test.tsx` import errors (TableHeader)
- ✅ Ensure all tests pass before adding new ones

### 2. Coverage Reporting

- ✅ Configure coverage thresholds
- ⚠️ Generate initial coverage report
- ⚠️ Set up CI/CD coverage tracking

### 3. Test Utilities

- ✅ MSW handlers exist
- ⚠️ May need additional mocks for:
  - Supabase client
  - File uploads
  - WebSocket connections
  - IndexedDB (offline storage)

### 4. Test Data/Fixtures

- ✅ Some fixtures exist in `src/test/fixtures/`
- ⚠️ May need more comprehensive fixtures

---

## ESTIMATED EFFORT

### Total Tests Needed

**Critical:** 115-170 tests
**High:** 130-170 tests
**Medium:** 150-190 tests
**Total:** ~395-530 new tests

### Time Estimation

**Critical Priority:** 2-3 weeks
**High Priority:** 2-3 weeks
**Medium Priority:** 2-3 weeks
**Total:** 6-9 weeks (with 1 developer)

---

## NEXT STEPS

1. ✅ **Fix failing tests** (CodingGrid.test.tsx)
2. ⚠️ **Generate coverage report** (run `npm run test:coverage`)
3. ⚠️ **Create detailed test implementation plan** (test_implementation_plan.md)
4. ⚠️ **Start with Critical Priority tests**
5. ⚠️ **Set up CI/CD test automation**

---

## NOTES

- Current test infrastructure is good (Vitest, RTL, MSW, Playwright)
- Main gap is in test coverage, not infrastructure
- Focus on critical paths first (auth, API, data mutations)
- E2E tests exist (47 files) but unit/integration coverage is low
