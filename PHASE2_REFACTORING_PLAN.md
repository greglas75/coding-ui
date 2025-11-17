# 🔧 PHASE 2: REFACTORING PLAN

**Date:** 2025-01-11  
**Status:** Ready for Approval  
**Risk Level:** Medium (with proper testing)

---

## 🎯 EXECUTION STRATEGY

### Safety First Approach
1. ✅ **One change at a time** - Never batch multiple refactors
2. ✅ **Test after each change** - Run tests before proceeding
3. ✅ **Git commit after each success** - Easy rollback if needed
4. ✅ **Verify functionality** - Manual smoke test after each change
5. ✅ **Stop if anything breaks** - Fix before continuing

---

## 📋 REFACTORING BATCHES (Ordered by Risk)

### BATCH 1: Low Risk - Dead Code Removal ⚠️ SAFE
**Risk:** Very Low (never imported)  
**Estimated Time:** 15 minutes  
**Files Affected:** 7 files

#### Changes:
1. **Remove example components** (never imported)
   - `src/components/examples/AIQueueExample.tsx`
   - `src/components/examples/AISettingsExample.tsx`
   - `src/components/examples/ErrorHandlingExample.tsx`
   - `src/components/examples/PerformanceMonitorExample.tsx`
   - `src/components/examples/SentimentUsageExample.tsx`
   - `src/components/examples/StoreUsageExample.tsx`
   - `src/components/examples/VirtualizationExample.tsx`

**Verification:**
- ✅ Run: `grep -r "from.*examples" src` (should return 0 results)
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Run: `npm run build` (build succeeds)
- ✅ Manual: Start dev server, verify app loads

**Rollback:** `git restore src/components/examples/`

---

### BATCH 2: Low Risk - Utility Consolidation ⚠️ SAFE
**Risk:** Low (pure functions, easy to test)  
**Estimated Time:** 30 minutes  
**Files Affected:** ~20 files

#### Changes:
1. **Create `src/lib/dateUtils.ts`** (single formatDate implementation)
   - Extract formatDate from one file
   - Add comprehensive tests
   - Update all 14 imports

2. **Create `src/lib/duplicateHelpers.ts`** (single findDuplicateAnswers)
   - Extract from useAnswerActions.ts
   - Support both sync and async versions
   - Update all 3 imports

**Verification:**
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Run: `npm run type-check` (no TypeScript errors)
- ✅ Manual: Test date formatting in all tables
- ✅ Manual: Test duplicate detection in CodingGrid

**Rollback:** `git restore src/lib/ src/components/ src/hooks/`

---

### BATCH 3: Medium Risk - API Client Cleanup ⚠️ CAUTION
**Risk:** Medium (need to verify all imports)  
**Estimated Time:** 20 minutes  
**Files Affected:** ~10 files

#### Changes:
1. **Find all imports of `lib/apiClient`**
   - `grep -r "from.*lib/apiClient" src`
   - `grep -r "from.*lib/apiClient" src`

2. **Update imports to `services/apiClient`**
   - Replace all imports
   - Remove `src/lib/apiClient.ts`

**Verification:**
- ✅ Run: `grep -r "lib/apiClient" src` (should return 0)
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Run: `npm run build` (build succeeds)
- ✅ Manual: Test API calls (health check, filter answers)

**Rollback:** `git restore src/lib/apiClient.ts src/`

---

### BATCH 4: Medium Risk - Debounce Consolidation ⚠️ CAUTION
**Risk:** Medium (need to test all usages)  
**Estimated Time:** 25 minutes  
**Files Affected:** ~5 files

#### Changes:
1. **Consolidate debounce into `src/lib/debounce.ts`**
   - Keep all variants (debounce, useDebouncedCallback, useDebounce)
   - Update `src/hooks/useDebounce.ts` to re-export from lib
   - Remove `src/components/FiltersBar/hooks/useDebouncedSearch.ts` (merge into FiltersBar)

**Verification:**
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Manual: Test search debouncing (300ms delay)
- ✅ Manual: Test filter debouncing
- ✅ Manual: Test infinite scroll debouncing

**Rollback:** `git restore src/lib/debounce.ts src/hooks/ src/components/FiltersBar/`

---

### BATCH 5: High Risk - Supabase Helpers Merge ⚠️ HIGH CAUTION
**Risk:** High (many imports, complex functionality)  
**Estimated Time:** 45 minutes  
**Files Affected:** ~30 files

#### Changes:
1. **Merge 3 Supabase files into one**
   - `src/lib/supabase.ts` (base client)
   - `src/lib/supabaseHelpers.ts` (CRUD operations)
   - `src/lib/supabaseOptimized.ts` (advanced features)
   
   **New structure:**
   ```
   src/lib/supabase.ts
   ├── Client creation (from supabase.ts)
   ├── Basic CRUD (from supabaseHelpers.ts)
   └── Advanced features (from supabaseOptimized.ts)
   ```

2. **Update all imports** (~30 files)
   - Find: `grep -r "from.*supabase" src`
   - Update to single import source

**Verification:**
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Run: `npm run test:e2e` (E2E tests pass)
- ✅ Manual: Test all Supabase operations:
  - Fetch categories
  - Fetch codes
  - Create/update/delete codes
  - Save codes for answers
  - Pagination
  - Caching

**Rollback:** `git restore src/lib/supabase*.ts`

---

### BATCH 6: High Risk - Large File Splitting ⚠️ HIGH CAUTION
**Risk:** High (complex components, many dependencies)  
**Estimated Time:** 2-3 hours per file  
**Files Affected:** 2 files initially

#### Changes:
1. **Split `BrandValidationModal.tsx` (2,031 lines)**
   - Extract steps into sub-components
   - Extract hooks into separate files
   - Keep main modal < 300 lines

2. **Split `SettingsPage.tsx` (1,388 lines)**
   - Extract settings sections
   - Keep main page < 200 lines

**Verification:**
- ✅ Run: `npm run test:run` (all tests pass)
- ✅ Run: `npm run test:e2e` (E2E tests pass)
- ✅ Manual: Test all modal steps
- ✅ Manual: Test all settings sections

**Rollback:** `git restore src/components/`

---

## 📊 ESTIMATED IMPACT

### File Count
```
Before:  266 files
After:   ~245 files
Reduction: -21 files (-8%)
```

### Code Reduction
```
Before:  59,085 lines
After:   ~57,471 lines
Reduction: -1,614 lines (-2.7%)
```

### Bundle Size
```
Estimated: -58KB (gzipped)
Percentage: -5% to -10%
```

---

## 🧪 TESTING CHECKLIST

### Before Starting
- [ ] All tests pass: `npm run test:all`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Git commit current state: `git commit -m "Pre-refactoring checkpoint"`

### After Each Batch
- [ ] Unit tests pass: `npm run test:run`
- [ ] Type check passes: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] Manual smoke test (key features work)
- [ ] Git commit: `git commit -m "Refactor: [batch description]"`

### After All Batches
- [ ] All tests pass: `npm run test:all`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Bundle size check: `npm run build:analyze`
- [ ] Performance check (no regressions)
- [ ] Full manual testing (all features)

---

## ⚠️ RISK MITIGATION

### For Each Batch:
1. **Create feature branch:** `git checkout -b refactor/batch-N`
2. **Make changes incrementally**
3. **Test after each file change**
4. **Commit frequently**
5. **If tests fail:** Stop, fix, or revert

### Rollback Strategy:
- Each batch is independent
- Can rollback individual batches
- Git commits after each success
- Tag before starting: `git tag pre-refactor`

---

## 🚀 EXECUTION ORDER

### Recommended Sequence:
1. ✅ **Batch 1** - Dead code (safest, quick win)
2. ✅ **Batch 2** - Utilities (low risk, high impact)
3. ✅ **Batch 3** - API client (medium risk, clean)
4. ✅ **Batch 4** - Debounce (medium risk, consolidate)
5. ⚠️ **Batch 5** - Supabase (high risk, test thoroughly)
6. ⚠️ **Batch 6** - Large files (highest risk, do last)

### Stop Conditions:
- ❌ Any test fails → Stop and fix
- ❌ Build fails → Stop and fix
- ❌ TypeScript errors → Stop and fix
- ❌ Manual test fails → Stop and fix

---

## 📝 NOTES

- **Don't rush** - Quality over speed
- **Test everything** - Better safe than sorry
- **Commit often** - Easy rollback
- **Ask if unsure** - Better to clarify than break

---

**READY FOR APPROVAL?**

Please review this plan and approve before I proceed with Phase 3 execution.

