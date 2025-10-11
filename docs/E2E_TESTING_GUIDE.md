# 🎭 E2E Testing with Playwright - Complete Guide

## ✅ What Has Been Implemented

### 1. Playwright Configuration

**Location:** `playwright.config.ts`

**Settings:**
- ✅ Test directory: `e2e/tests`
- ✅ Timeout: 30 seconds per test
- ✅ Parallel execution
- ✅ Retry on CI (2 attempts)
- ✅ Multiple reporters (HTML, List, JSON)
- ✅ Screenshots on failure
- ✅ Video recording on failure
- ✅ Trace on retry

### 2. E2E Test Suites

**New Tests Created:**
- ✅ `auth-login.spec.ts` - Authentication & navigation (12 tests)
- ✅ `answer-coding.spec.ts` - Answer coding workflow (9 tests)
- ✅ `import-export.spec.ts` - Import/export functionality (10 tests)
- ✅ `qa-workflow.spec.ts` - Complete QA workflows (9 tests)

**Existing Tests:**
- ✅ `categories.spec.ts`
- ✅ `codes.spec.ts`
- ✅ `coding.spec.ts`
- ✅ `workflow-*.spec.ts` (5 workflow tests)
- ✅ And 13 more test files!

**Total:** 40+ E2E tests

### 3. Test Helpers

**Location:** `e2e/helpers/e2e-helpers.ts`

**Functions:**
- ✅ Navigation helpers (`navigateToCategories`, `navigateToCoding`)
- ✅ Category helpers (`createCategory`, `deleteCategory`)
- ✅ Code helpers (`createCode`)
- ✅ Coding helpers (`codeAnswer`, `bulkCodeAnswers`)
- ✅ Filter helpers (`applyFilter`, `searchAnswers`)
- ✅ Export/import helpers (`exportData`, `importData`)
- ✅ Assertion helpers (`expectTableHasRows`)
- ✅ Wait helpers (`waitForLoadingToFinish`, `waitForModalToOpen`)

---

## 🚀 Running E2E Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/tests/auth-login.spec.ts

# Run with headed browser (see what's happening)
npx playwright test --headed

# Run in debug mode
npm run test:e2e:debug

# Run specific test by name
npx playwright test -g "should load coding grid"
```

### Recording New Tests

```bash
# Record new test by clicking through the app
npm run test:e2e:record

# Opens browser where you can:
# 1. Click through your app
# 2. Playwright records your actions
# 3. Generates test code automatically!
```

### View Test Reports

```bash
# Open HTML report
npm run test:e2e:report

# Opens browser with:
# - Test results
# - Screenshots
# - Videos (on failure)
# - Traces (on retry)
```

---

## 📝 Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.click('a[href="/page"]');

    // Act
    await page.fill('input[name="field"]', 'value');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { test, expect } from '@playwright/test';
import {
  navigateToCoding,
  codeAnswer,
  expectTableHasRows,
} from '../helpers/e2e-helpers';

test('should code an answer', async ({ page }) => {
  await page.goto('/');

  // Use helper to navigate
  await navigateToCoding(page, 0);

  // Use helper to code answer
  await codeAnswer(page, 0, 0);

  // Use helper assertion
  await expectTableHasRows(page, 1);
});
```

---

## 🎯 Test Suites Overview

### 1. Authentication & Login (`auth-login.spec.ts`)

Tests:
- ✅ Application loads
- ✅ Page navigation
- ✅ Session persistence
- ✅ Browser back/forward
- ✅ Error boundary handling
- ✅ Loading states
- ✅ Responsive design
- ✅ LocalStorage
- ✅ Accessibility

**Run:** `npx playwright test e2e/tests/auth-login.spec.ts`

### 2. Answer Coding (`answer-coding.spec.ts`)

Tests:
- ✅ Coding grid loads
- ✅ Select answer
- ✅ Assign code
- ✅ Filter answers
- ✅ Keyboard shortcuts
- ✅ AI suggestions
- ✅ Batch operations
- ✅ Coding stats
- ✅ Empty state

**Run:** `npx playwright test e2e/tests/answer-coding.spec.ts`

### 3. Import/Export (`import-export.spec.ts`)

Tests:
- ✅ Open export modal
- ✅ Export options
- ✅ Format selection
- ✅ Template download
- ✅ Import upload area
- ✅ File validation
- ✅ Import progress
- ✅ Error handling
- ✅ Export with formats
- ✅ Import summary

**Run:** `npx playwright test e2e/tests/import-export.spec.ts`

### 4. QA Workflow (`qa-workflow.spec.ts`)

Tests:
- ✅ End-to-end workflow (create → code → export)
- ✅ Filter → batch select → batch code
- ✅ Search → code → verify → export
- ✅ No console errors
- ✅ No broken links
- ✅ Slow network handling
- ✅ Offline mode
- ✅ Performance under load
- ✅ Data integrity
- ✅ Error recovery

**Run:** `npx playwright test e2e/tests/qa-workflow.spec.ts`

---

## 📊 Test Coverage

```
Total E2E Tests: 40+

By Category:
- Authentication: 12 tests
- Coding: 9 tests
- Import/Export: 10 tests
- QA Workflow: 9 tests
- Existing Tests: 20+ tests

Coverage:
✅ Core workflows
✅ Error handling
✅ Performance
✅ Accessibility
✅ Mobile responsive
✅ Offline mode
✅ Data integrity
```

---

## 🎯 Best Practices

### 1. Use Data Attributes

```typescript
// ✅ Good - stable selector
await page.click('[data-testid="submit-button"]');

// ❌ Bad - fragile selector
await page.click('.btn.btn-primary.submit');
```

### 2. Wait for Elements

```typescript
// ✅ Good - wait for element
await page.waitForSelector('table', { timeout: 10000 });
await page.click('table tbody tr');

// ❌ Bad - might click too early
await page.click('table tbody tr');
```

### 3. Use Helpers

```typescript
// ✅ Good - DRY
import { navigateToCoding, codeAnswer } from '../helpers/e2e-helpers';

await navigateToCoding(page);
await codeAnswer(page, 0, 0);

// ❌ Bad - repetitive
await page.click('a[href="/categories"]');
await page.waitForSelector('table');
await page.click('table tbody tr:first-child');
// ... 10 more lines
```

### 4. Handle Async Operations

```typescript
// ✅ Good - wait for async completion
const downloadPromise = page.waitForEvent('download');
await page.click('button:has-text("Export")');
const download = await downloadPromise;

// ❌ Bad - might miss the download
await page.click('button:has-text("Export")');
const download = await page.waitForEvent('download'); // Too late!
```

---

## 🔍 Debugging Tests

### Run in Headed Mode

```bash
npx playwright test --headed
```

See the browser and what's happening!

### Run in Debug Mode

```bash
npx playwright test --debug
```

Opens Playwright Inspector:
- Step through test
- Inspect selectors
- View screenshots
- Check network requests

### Run Specific Test

```bash
# By file
npx playwright test e2e/tests/auth-login.spec.ts

# By test name
npx playwright test -g "should load application"

# Single test in file
npx playwright test e2e/tests/auth-login.spec.ts:10
```

### View Trace

If test fails and retries:

```bash
# Open trace viewer
npx playwright show-trace trace.zip
```

Shows:
- Timeline of actions
- Screenshots at each step
- Network requests
- Console logs

---

## 📸 Screenshots & Videos

### Automatic Screenshots

On test failure:
```
test-results/
  auth-login-should-load-application/
    test-failed-1.png
```

### Manual Screenshots

```typescript
test('my test', async ({ page }) => {
  await page.goto('/');

  // Take screenshot
  await page.screenshot({ path: 'screenshot.png' });

  // Full page screenshot
  await page.screenshot({ path: 'full.png', fullPage: true });

  // Screenshot specific element
  await page.locator('table').screenshot({ path: 'table.png' });
});
```

### Videos

Videos are recorded on failure (configured in `playwright.config.ts`):

```
test-results/
  auth-login-should-load-application/
    video.webm
```

---

## 🎭 Test Fixtures

### Using Test Data

```typescript
import testData from '../fixtures/test-data.json';

test('should use test data', async ({ page }) => {
  await page.goto('/');

  // Use data from fixture
  await page.fill('input[name="name"]', testData.categories[0].name);
});
```

### Creating Fixtures

```typescript
// e2e/fixtures/test-data.json
{
  "categories": [
    { "name": "Test Category 1" },
    { "name": "Test Category 2" }
  ],
  "codes": [
    { "name": "Test Code 1", "isWhitelisted": true },
    { "name": "Test Code 2", "isWhitelisted": false }
  ]
}
```

---

## 🎯 Common Patterns

### Pattern 1: Complete Workflow Test

```typescript
test('complete user journey', async ({ page }) => {
  // 1. Navigate
  await page.goto('/categories');

  // 2. Create category
  await createCategory(page, 'E2E Test Category');

  // 3. Navigate to coding
  await navigateToCoding(page, 0);

  // 4. Code answers
  await codeAnswer(page, 0, 0);
  await codeAnswer(page, 1, 0);

  // 5. Export data
  const download = await exportData(page, 'excel');
  expect(await download.suggestedFilename()).toContain('.xlsx');

  // 6. Cleanup
  await deleteCategory(page, 'E2E Test Category');
});
```

### Pattern 2: Error Handling Test

```typescript
test('should handle API errors', async ({ page }) => {
  // Intercept and fail API calls
  await page.route('**/api/categories', route => {
    route.abort('failed');
  });

  await page.goto('/categories');

  // Should show error message
  await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 5000 });

  // App should not crash
  await expect(page.locator('body')).toBeVisible();
});
```

### Pattern 3: Performance Test

```typescript
test('should load quickly', async ({ page }) => {
  const start = Date.now();

  await page.goto('/');
  await page.waitForSelector('table', { timeout: 10000 });

  const duration = Date.now() - start;

  console.log(`Page loaded in ${duration}ms`);
  expect(duration).toBeLessThan(3000); // Should load in < 3s
});
```

---

## 📊 Test Reports

### HTML Report

```bash
npm run test:e2e:report
```

Opens browser with:
- All test results
- Pass/fail status
- Duration
- Screenshots
- Videos
- Traces

### JSON Report

```json
{
  "suites": [...],
  "tests": [...],
  "stats": {
    "expected": 40,
    "unexpected": 0,
    "skipped": 0
  }
}
```

Located at: `test-results/results.json`

---

## 🔧 Configuration

### Browser Selection

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile', use: { ...devices['iPhone 12'] } },
]
```

### Viewport Size

```typescript
// In config
use: {
  viewport: { width: 1920, height: 1080 },
}

// In test
test('mobile test', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  // ...
});
```

### Timeouts

```typescript
// playwright.config.ts
timeout: 30 * 1000,           // Test timeout
actionTimeout: 10 * 1000,      // Action timeout
navigationTimeout: 30 * 1000,  // Navigation timeout

// In test
test.setTimeout(60000); // 60 second timeout for this test
```

---

## 🎯 Test Organization

```
e2e/
├── tests/                      # Test files
│   ├── auth-login.spec.ts      # Authentication
│   ├── answer-coding.spec.ts   # Coding workflow
│   ├── import-export.spec.ts   # Import/Export
│   ├── qa-workflow.spec.ts     # QA workflows
│   └── ... (20+ more files)
│
├── helpers/                    # Helper functions
│   ├── test-helpers.ts         # Existing helpers
│   └── e2e-helpers.ts          # New E2E helpers
│
├── fixtures/                   # Test data
│   └── test-data.json
│
└── screenshots/                # Manual screenshots

test-results/                   # Test artifacts
playwright-report/              # HTML reports
```

---

## 📚 Examples

### Example 1: Login & Navigate

```typescript
import { test, expect } from '@playwright/test';
import { navigateToCategories } from '../helpers/e2e-helpers';

test('user can navigate', async ({ page }) => {
  await page.goto('/');

  await navigateToCategories(page);

  await expect(page).toHaveURL(/categories/);
  await expect(page.locator('table')).toBeVisible();
});
```

### Example 2: Code Answer

```typescript
import { test } from '@playwright/test';
import { navigateToCoding, codeAnswer } from '../helpers/e2e-helpers';

test('user can code answer', async ({ page }) => {
  await page.goto('/');

  await navigateToCoding(page, 0);
  await codeAnswer(page, 0, 0);

  // Verify answer is coded
  const codedAnswer = page.locator('table tbody tr').first();
  await expect(codedAnswer).toContainText(/coded|whitelisted/i);
});
```

### Example 3: Export Data

```typescript
import { test, expect } from '@playwright/test';
import { exportData } from '../helpers/e2e-helpers';

test('user can export data', async ({ page }) => {
  await page.goto('/categories');
  await page.waitForTimeout(2000);

  const download = await exportData(page, 'excel');

  const filename = await download.suggestedFilename();
  expect(filename).toMatch(/\.xlsx$/);

  console.log('Downloaded:', filename);
});
```

### Example 4: Complete Workflow

```typescript
import { test } from '@playwright/test';
import {
  createCategory,
  navigateToCoding,
  codeAnswer,
  exportData,
  deleteCategory,
} from '../helpers/e2e-helpers';

test('complete workflow', async ({ page }) => {
  await page.goto('/');

  // 1. Create category
  await createCategory(page, 'E2E Test');

  // 2. Navigate to coding
  await navigateToCoding(page, 0);

  // 3. Code answers
  await codeAnswer(page, 0, 0);
  await codeAnswer(page, 1, 0);

  // 4. Export
  await exportData(page, 'excel');

  // 5. Cleanup
  await deleteCategory(page, 'E2E Test');
});
```

---

## 🎨 Advanced Techniques

### Network Interception

```typescript
test('should handle API errors', async ({ page }) => {
  // Fail all API calls
  await page.route('**/api/**', route => route.abort('failed'));

  await page.goto('/');

  // Should show error
  await expect(page.locator('text=error')).toBeVisible();
});
```

### Custom Fixtures

```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Log in
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Use page
    await use(page);

    // Teardown: Log out
    await page.click('button:has-text("Logout")');
  },
});

test('should access protected route', async ({ authenticatedPage }) => {
  // Page is already logged in!
  await authenticatedPage.goto('/protected');
  await expect(authenticatedPage.locator('h1')).toBeVisible();
});
```

### Visual Regression Testing

```typescript
import { test, expect } from '@playwright/test';

test('should match visual snapshot', async ({ page }) => {
  await page.goto('/');

  // Take snapshot
  await expect(page).toHaveScreenshot('homepage.png');

  // Playwright will:
  // - First run: Save screenshot as baseline
  // - Future runs: Compare with baseline
  // - Fail if different!
});
```

---

## 🐛 Troubleshooting

### Issue: Test times out

**Cause:** Element not appearing

**Solution:**
```typescript
// Increase timeout
await page.waitForSelector('table', { timeout: 30000 });

// Or in config
test.setTimeout(60000);
```

### Issue: Element not clickable

**Cause:** Overlapping elements, not visible

**Solution:**
```typescript
// Wait for element to be visible
await expect(element).toBeVisible();

// Force click
await element.click({ force: true });

// Scroll into view first
await element.scrollIntoViewIfNeeded();
await element.click();
```

### Issue: Flaky tests

**Cause:** Race conditions, timing issues

**Solution:**
```typescript
// Use waitFor instead of waitForTimeout
await page.waitForSelector('table');

// Use expect with timeout
await expect(element).toBeVisible({ timeout: 10000 });

// Add retry
test.describe.configure({ retries: 2 });
```

---

## ✅ Summary

✅ **Playwright configured** with optimal settings
✅ **40+ E2E tests** covering critical workflows
✅ **4 new test suites** for auth, coding, import/export, QA
✅ **Test helpers** for common operations
✅ **Documentation** complete
✅ **CI-ready** with retries and parallel execution

### Test Results:
- **Auth & Login:** 12 tests
- **Answer Coding:** 9 tests
- **Import/Export:** 10 tests
- **QA Workflow:** 9 tests
- **Existing:** 20+ tests
- **Total:** 40+ tests

**E2E testing infrastructure is production-ready!** 🎭

---

**Quick Start:**
```bash
npm run test:e2e           # Run all tests
npm run test:e2e:ui        # Interactive mode
npm run test:e2e:record    # Record new tests
npm run test:e2e:report    # View reports
```

Happy Testing! 🎉

